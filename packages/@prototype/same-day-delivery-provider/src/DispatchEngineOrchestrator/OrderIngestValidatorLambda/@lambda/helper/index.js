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
const ddb = require('../lib/dynamoDB')
const config = require('../config')
const callback = require('../lib/callbackTrigger')
const constants = require('../config/constants')

const getAllOrdersByStatus = async (status) => {
	let finalResults = []
	let lastEvaluatedKey

	do {
		const page = await ddb.query(
			config.sameDayDeliveryProviderOrders,
			config.sameDayDeliveryProviderOrdersStatusPartitionIndex,
			{
				status,
			},
			lastEvaluatedKey,
		)

		lastEvaluatedKey = page.LastEvaluatedKey
		finalResults = finalResults.concat(page.Items)

		console.log('lastEvaluatedKey: ', lastEvaluatedKey)
	} while (lastEvaluatedKey)

	return finalResults
}

function * chunks (arr, n) {
	for (let i = 0; i < arr.length; i += n) {
		yield arr.slice(i, i + n)
	}
}

const updateOrdersWithBatchId = (orders, batchId) => {
	const chunkSize = 25
	const groups = [...chunks(orders, chunkSize)]

	return Promise.all(
		groups.map((chunkedOrders) => ddb.transactUpdateBatchId(
			config.sameDayDeliveryProviderOrders,
			chunkedOrders.map(q => q.ID),
			batchId,
		)),
	)
}

const cancelOrder = async ({ ID }) => {
	const orderId = ID
	console.info('Executing order cancellation for: ', orderId)

	const res = await ddb.get(config.sameDayDeliveryProviderOrders, orderId)

	if (!res.Item) {
		console.error('CRITICAL! Attempting to delete an order that does not exists: ', orderId)

		return
	}

	if (res.Item.status === constants.UNASSIGNED) {
		try {
			await ddb.updateItem(config.sameDayDeliveryProviderOrders, orderId, {
				status: constants.CANCELLED,
			}, {
				status: constants.UNASSIGNED,
			})
		} catch (err) {
			console.warn('Order changed status meanwhile, skipping: ', orderId)
			console.warn(err)

			return { success: false }
		}

		try {
			await callback.sendCallback(orderId, constants.CANCELLED)

			console.info('Callback sent for order: ', orderId)
		} catch (err) {
			console.error('Error sending the callback: ', orderId)
			console.error(err)

			return { success: false }
		}

		return { success: true }
	}

	console.warn('WARNING! The order has been assigned/cancelled already: ', orderId)

	return { success: false }
}

module.exports = {
	getAllOrdersByStatus,
	cancelOrder,
	updateOrdersWithBatchId,
}
