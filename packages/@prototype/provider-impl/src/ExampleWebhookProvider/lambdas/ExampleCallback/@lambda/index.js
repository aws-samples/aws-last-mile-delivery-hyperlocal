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
const aws = require('aws-sdk')
const config = require('./config')
const { success, fail } = require('/opt/lambda-utils')
const { getRedisClient } = require('/opt/redis-client')

const client = getRedisClient()
client.hdel = promisify(client.hdel)

const eventBridge = new aws.EventBridge()

const mapStateToOrderStatus = (state) => {
	switch (state) {
		case 'TO_RESTAURANT':
			return 'ARRIVED_AT_ORIGIN'
		default:
			return state
	}
}

const handler = async (event, context) => {
	if (event.body === undefined) {
		console.error(` :: WebhookProvider-ExampleCallback :: POST :: 'body' not found in event object: ${JSON.stringify(event)}`)

		return fail({ error: 'Unrecognized message format' })
	}

	// check body
	let { body } = event

	if (typeof body === 'string' || body instanceof String) {
		body = JSON.parse(body)
	}

	if (!recordValid(body)) {
		console.error(`Record not valid. Skipping. Data received: ${JSON.stringify(body)}`)

		return fail({ error: 'Message format invalid' })
	}

	const status = mapStateToOrderStatus(body.state)

	try {
		if (status === 'DELIVERED' || status === 'CANCELLED') {
			await client.hdel(`provider:${config.providerName}:order`, body.inputData.orderId)
		}

		console.debug('Sending order update event on event bridge with status: ', status)

		await eventBridge.putEvents({
			Entries: [{
				EventBusName: config.eventBus,
				Source: config.serviceName,
				DetailType: 'ORDER_UPDATE',
				Detail: JSON.stringify({
					orderId: body.inputData.orderId,
					status,
				}),
			}],
		}).promise()

		console.debug(`ORDER_UPDATE :: ${JSON.stringify(body)} :: Successfully sent to Event Bridge`)

		return success()
	} catch (err) {
		console.error(`Error sending message to Event Bridge :: ${JSON.stringify(body)}`)
		console.error(err)
	}
}

const recordValid = (record) => {
	return !!record.state && !!record.inputData && !!record.inputData.orderId
}
exports.handler = handler
