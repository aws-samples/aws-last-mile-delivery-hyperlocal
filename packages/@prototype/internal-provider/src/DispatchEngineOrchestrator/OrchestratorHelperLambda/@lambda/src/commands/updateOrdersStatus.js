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
const config = require('../config')
const constants = require('../config/constants')

const processIndividualOrder = async (driverId, driverIdentity, order) => {
	const { orderId } = order
	const res = await ddb.get(config.providerOrdersTable, orderId)

	if (!res.Item) {
		throw new Error('Order does not exists')
	}

	if (res.Item.status === constants.UNASSIGNED) {
		try {
			await ddb.updateItem(config.providerOrdersTable, orderId, {
				status: constants.ASSIGNED,
				driverId,
				driverIdentity,
				assignedAt: Date.now(),
			}, {
				status: constants.UNASSIGNED,
			})

			return constants.ASSIGNED
		} catch (err) {
			logger.warn('Error locking order ', orderId, '. Must be locked by another driver')
			logger.warn(err)

			return constants.CONFLICT
		}
	}

	return constants.LOCKED
}

const execute = async (payload) => {
	logger.info('Updating order status for payload')
	logger.info(JSON.stringify(payload))
	const { driverId, driverIdentity, orders } = payload
	const statusList = []

	for (const order of orders) {
		const status = await processIndividualOrder(
			driverId,
			driverIdentity,
			order,
		)

		statusList.push({ status, orderId: order.orderId })
	}

	const allAssigned = statusList.every(q => q.status === constants.ASSIGNED)

	return {
		status: allAssigned ? constants.ALL_ASSIGNED : constants.ANY_CONFLICT,
		statusList,
	}
}

module.exports = {
	execute,
}
