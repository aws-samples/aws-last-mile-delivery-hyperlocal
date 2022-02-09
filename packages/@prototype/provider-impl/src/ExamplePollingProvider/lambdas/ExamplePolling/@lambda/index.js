/*********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                               *
 *                                                                                                                   *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy of                                  *
 *  this software and associated documentation files (the "Software"), to deal in                                    *
 *  the Software without restriction, including without limitation the rights to                                     *
 *  use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of                                 *
 *  the Software, and to permit persons to whom the Software is furnished to do so.                                  *
 *                                                                                                                   *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR                                       *
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS                                 *
 *  FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR                                   *
 *  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER                                   *
 *  IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN                                          *
 *  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                       *
 *********************************************************************************************************************/
/* eslint-disable no-console */
const { promisify } = require('util')
const axios = require('axios')
const aws = require('aws-sdk')
const config = require('./config')
const secrets = require('./lib/secretsManager')
const { success, fail } = require('/opt/lambda-utils')
const { getRedisClient } = require('/opt/redis-client')

const client = getRedisClient()
client.hget = promisify(client.hget)
client.hset = promisify(client.hset)
client.hlen = promisify(client.hlen)
client.hdel = promisify(client.hdel)

const eventBridge = new aws.EventBridge()
const sqs = new aws.SQS()

const mapStateToOrderStatus = (state) => {
	switch (state) {
		case 'TO_ORIGIN':
			return 'ARRIVED_AT_ORIGIN'
		default:
			return state
	}
}

const processRecord = async (record, apiKey) => {
	console.log('Processing record: ', record.body)
	const body = JSON.parse(record.body)
	const { orderId, externalOrderId } = body

	if (!recordValid(body)) {
		console.error(`Record not valid. Skipping. Data received: ${JSON.stringify(body)}`)

		throw new Error('Record not valid')
	}
	const previousStatus = await client.hget(`provider:${config.providerName}:orderStatus`, orderId)

	if (!previousStatus) {
		console.warn('Order with ID ', orderId, ' is not in the hash table, it may have been processed already. Skipping')

		return false
	}

	try {
		const res = await axios.get(`${config.externalProviderMockUrl}/order/${externalOrderId}`, {
			headers: {
				'x-api-key': apiKey,
			},
		})
		const { order: providerOrder } = res.data
		const newStatus = mapStateToOrderStatus(providerOrder.state)

		if (previousStatus !== providerOrder.state) {
			console.log(`Previous state is different than current state for order ${orderId}, sending order update event on event bridge`)

			await eventBridge.putEvents({
				Entries: [{
					EventBusName: config.eventBus,
					Source: config.serviceName,
					DetailType: 'ORDER_UPDATE',
					Detail: JSON.stringify({
						orderId,
						status: newStatus,
					}),
				}],
			}).promise()

			await client.hset(`provider:${config.providerName}:orderStatus`, orderId, newStatus)
		}

		const hashLength = await client.hlen(`provider:${config.providerName}:order`)
		// build a simple message group Id based on number of orders for this provider
		// plus the hour of the day. This will build up a scenario where you'd have
		// a different message group ID for every 100 messages hour
		// which will allow to scale
		const currentMessageRatio = Math.floor(hashLength / 100)
		const currentHourTs = Math.floor(Date.now() / 1000 / 3600)

		if (!isFinalState(newStatus)) {
			console.log(`Order ${orderId} is not in a final state yet, sending the message back into the queue`)
			/// set the message back in queue to query the status again
			/// if it didn't reach the final state
			const ts = Date.now()
			const res = await sqs.sendMessage({
				MessageGroupId: `${currentMessageRatio}-${currentHourTs}`,
				MessageDeduplicationId: `${orderId}-${ts}`,
				QueueUrl: config.queueName,
				MessageBody: JSON.stringify({
					orderId,
					externalOrderId,
					status: newStatus,
				}),
			}).promise()

			console.log('Enqueue response: ', JSON.stringify(res))
		} else {
			console.log(`Order ${orderId} is in a final state, cleaning up the hash`)

			await client.hdel(`provider:${config.providerName}:orderStatus`, orderId)
			await client.hdel(`provider:${config.providerName}:order`, orderId)
		}
	} catch (err) {
		console.error('Error processing the record from the queue: ', JSON.stringify(record))
		console.error(err)

		// the exception should be thrown up so that SQS can send the messages back again
		// eventual messages processed twice won't affect the algorithm given that all
		// the edge cases are handled above

		// the messages will be reprocessed according to the MaxReceiveCount
		// when MaxReceiveCount is exceeded they'd go in the dead letter queue
		throw err
	}

	return true
}

const isFinalState = (state) => state === 'DELIVERED' || state === 'CANCELLED'

const handler = async (event, context) => {
	console.log('Event from SQS: ', JSON.stringify(event))

	const records = event.Records || []
	const apiKey = await secrets.getSecretValue(config.externalProviderSecretName)

	console.log('Processing the batch...')

	// it'll handle as many messages as per the BatchSize
	const promises = records.map((r) => processRecord(r, apiKey))
	const results = await Promise.all(promises.map(p => p.catch(e => e)))

	console.log('Batch processed...', JSON.stringify(results))

	const errors = results.filter(result => result instanceof Error)

	if (errors.length > 0) {
		console.warn('Error found, throwing exception to allow sqs to requeue the messages')
		// to ack SQS to resend the messages as there were errors in the previous batch
		// the one that were processsed correctly earlier would not be affected by
		// multiple processes
		throw Error('Error processing messages in the queue')
	}

	return success()
}

const recordValid = (record) => {
	return !!record.orderId && record.externalOrderId
}
exports.handler = handler
