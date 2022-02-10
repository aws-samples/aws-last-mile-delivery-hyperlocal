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
const ddb = require('../lib/dynamoDB')
const callback = require('../lib/callbackTrigger')
const config = require('../config')
const constants = require('../config/constants')

const cancelOrder = async ({ orderId }) => {
	logger.info('Executing order cancellation for: ', orderId)

	const res = await ddb.get(config.providerOrdersTable, orderId)

	if (!res.Item) {
		logger.error('CRITICAL! Attempting to delete an order that does not exists: ', orderId)

		return
	}

	if (res.Item.status === constants.UNASSIGNED) {
		try {
			await ddb.updateItem(config.providerOrdersTable, orderId, {
				status: constants.CANCELLED,
			}, {
				status: constants.UNASSIGNED,
			})
		} catch (err) {
			logger.warn('Order changed status meanwhile, skipping: ', orderId)
			logger.warn(err)

			return { success: false }
		}

		try {
			await callback.sendCallback(orderId, constants.CANCELLED)

			logger.info('Callback sent for order: ', orderId)
		} catch (err) {
			logger.error('Error sending the callback: ', orderId)
			logger.error(err)

			return { success: false }
		}

		return { success: true }
	}

	return { success: false }
}

const execute = async (payload) => {
	logger.info('Executing order cancellation payload')
	logger.info(payload)

	const { orders } = payload

	await Promise.all(orders.map(cancelOrder))

	return { executed: true }
}

module.exports = {
	execute,
}
