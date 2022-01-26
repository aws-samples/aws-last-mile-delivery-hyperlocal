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
const logger = require('../utils/logger')
const config = require('../config')
const constants = require('../config/constants')
const ddb = require('../lib/dynamoDB')
const kinesis = require('../lib/kinesis')

const execute = async (payload) => {
	logger.info('Sending order back to kinesis for payload')
	logger.info(JSON.stringify(payload))
	const { orders, ordersReleased } = payload

	for (const order of orders) {
		const { orderId } = order
		const res = await ddb.get(config.providerOrdersTable, orderId)

		if (!res || !res.Item) {
			logger.error('CRITICAL! Cannot find order with ID: ', orderId)

			continue
		}

		const { Item: currentOrder } = res

		let sendToKinesis = true

		if (ordersReleased) {
			/// if this command has been executed after releasing the order lock
			/// the array as result from the ReleaseOrdersLock step function state
			/// will be used as way to differentiate between orders to be sent in kinesis or not

			// orders that have been previously locked (by another driver)
			// or had conflict in assignment (another driver concurrently took it)
			// won't be sent back to Kinesis as they're already being processed
			sendToKinesis = ordersReleased.includes(orderId)
		}

		// send order to Kinesis only if is required to and the order didn't get cancelled meanwhile
		if (sendToKinesis && currentOrder.status !== constants.CANCELLED) {
			await kinesis.putRecord(orderId, order)
		}
	}

	return { success: true }
}

module.exports = {
	execute,
}
