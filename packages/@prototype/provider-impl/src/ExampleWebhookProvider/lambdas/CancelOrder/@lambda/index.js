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
const axios = require('axios').default
const aws = require('aws-sdk')
const config = require('./config')
const secrets = require('./lib/secretsManager')
const { success, fail } = require('/opt/lambda-utils')
const { getRedisClient } = require('/opt/redis-client')

const eventBridge = new aws.EventBridge()

const handler = async (event, context) => {
	const orderId = event.pathParameters ? event.pathParameters.orderId : undefined

	if (!orderId) {
		return fail({
			error: 'Missing orderId',
		})
	}

	try {
		const client = await getRedisClient()
		const apiKey = await secrets.getSecretValue(config.externalProviderSecretName)
		const externalOrderId = await client.hGet(`provider:${config.providerName}:order`, orderId)

		await axios.delete(`${config.externalProviderMockUrl}/order/${externalOrderId}`, {
			headers: {
				'x-api-key': apiKey,
			},
		})

		await eventBridge.putEvents({
			Entries: [{
				EventBusName: config.eventBus,
				Source: config.serviceName,
				DetailType: 'ORDER_CANCELLATION_REQUESTED',
				Detail: JSON.stringify({
					orderId,
				}),
			}],
		}).promise()

		console.debug(`${orderId} :: Successfully sent to Event Bridge`)

		return success({})
	} catch (err) {
		console.error(`Error sending message to Event Bridge :: ${orderId}`)
		console.error(err)

		return fail({
			error: 'Error canceling the order',
		})
	}
}

exports.handler = handler
