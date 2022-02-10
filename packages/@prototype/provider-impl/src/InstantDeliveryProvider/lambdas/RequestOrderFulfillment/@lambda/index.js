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
const aws = require('aws-sdk')
const ddb = require('./lib/dynamoDB')
const { success, fail } = require('/opt/lambda-utils')

const STREAM_NAME = process.env.STREAM_NAME

const eventBridge = new aws.EventBridge()
const orderBatchStream = new aws.Kinesis()

const handler = async (event, context) => {
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
		const { orderId, ...others } = body

		const exists = await ddb.get(process.env.PROVIDER_ORDERS_TABLE, orderId)

		if (exists.Item) {
			return fail({ error: `The record with ID ${orderId} was already sent to the provider` })
		}

		await ddb.putItem(process.env.PROVIDER_ORDERS_TABLE, {
			ID: orderId,
			status: 'UNASSIGNED',
			...others,
		})

		const payload = JSON.stringify(body)

		await eventBridge.putEvents({
			Entries: [{
				EventBusName: process.env.EVENT_BUS,
				Source: process.env.SERVICE_NAME,
				DetailType: 'ORDER_FULFILLMENT_REQUESTED',
				Detail: payload,
			}],
		}).promise()

		// push into KDS for batching orders
		await orderBatchStream.putRecord({
			PartitionKey: body.orderId,
			Data: payload,
			StreamName: STREAM_NAME,
		}).promise()

		console.debug(`ORDER_FULFILLMENT_REQUESTED :: ${body} :: Successfully sent to Event Bridge and to KDS`)

		return success()
	} catch (err) {
		console.error(`Error sending message to Event Bridge or KDS :: ${body}`)
		console.error(err)
	}
}

const recordValid = (record) => {
	return !!record.orderId &&
		!!record.destination &&
		!!record.origin
}
exports.handler = handler
