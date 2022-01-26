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
const axios = require('axios')
const config = require('./config')
const secrets = require('./lib/secretsManager')
const { success, fail } = require('/opt/lambda-utils')
const { getRedisClient } = require('/opt/redis-client')

const client = getRedisClient()
client.hset = promisify(client.hset)

const eventBridge = new aws.EventBridge()

const handler = async (event, context) => {
	console.debug(JSON.stringify(event))

	if (event.body === undefined) {
		console.error(`:: POST :: 'body' not found in event object: ${JSON.stringify(event)}`)

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

	try {
		const apiKey = await secrets.getSecretValue(config.externalProviderSecretName)

		const res = await axios.post(
			`${config.externalProviderMockUrl}/order`,
			{
				callbackUrl: `${config.apiBaseUrl}/callback`,
				...body,
			}, {
				headers: {
					'x-api-key': apiKey,
				},
			},
		)

		console.debug('Response from provider: ', res.data)

		const { orderId: externalOrderId } = res.data

		await client.hset(`provider:${config.providerName}:order`, body.orderId, externalOrderId)

		await eventBridge.putEvents({
			Entries: [{
				EventBusName: config.eventBus,
				Source: config.serviceName,
				DetailType: 'ORDER_FULFILLMENT_REQUESTED',
				Detail: JSON.stringify(body),
			}],
		}).promise()

		console.debug(`ORDER_FULFILLMENT_REQUESTED :: ${JSON.stringify(body)} :: Successfully sent to Event Bridge`)

		return success()
	} catch (err) {
		console.error(`Error sending message to Event Bridge :: ${JSON.stringify(body)}`)
		console.error(err)
	}
}

const recordValid = (record) => {
	return !!record.orderId
}
exports.handler = handler
