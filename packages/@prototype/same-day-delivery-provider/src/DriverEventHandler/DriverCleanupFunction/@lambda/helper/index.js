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
const ddb = require('../lib/dynamoDB')
const config = require('../config')
const constants = require('../config/constants')

const getOrdersByStatus = (status) => {
	return ddb.query(config.sameDayDeliveryProviderOrders, config.sameDayDeliveryProviderOrdersStatusIndex, {
		status,
		updatedAt: {
			type: 'complex',
			operator: '>=',
			// query only the orders that are older than 2 minutes ago
			// this lambda should run sub minute execution so its enough to process only part of it
			value: Date.now() - (1000 * 60 * 2),
		},
	})
}

const setOrderToUnassigned = (orderId, previousState = null, newStatus = null) => {
	return ddb.updateItem(config.sameDayDeliveryProviderOrders, orderId, {
		status: newStatus || constants.STATES.UNASSIGNED,
	}, {
		status: previousState || constants.STATES.ASSIGNED,
	}, ['driverId', 'driverIdentity', 'assignedAt', 'batchId', 'jobId'])
}

const tryToReleaseDriver = async (driver, orderId) => {
	const orders = driver.orders || []

	if (driver) {
		const newOrderList = orders.filter(q => q !== orderId)

		try {
			await ddb.updateItem(config.sameDayDeliveryProviderLocks, driver.ID, {
				locked: newOrderList.length > 0,
				...(newOrderList.length > 0 ? { orders: newOrderList } : {}),
			}, {
				locked: true,
			}, newOrderList.length > 0 ? [] : ['orders'])
		} catch (err) {
			/// conditional check failed but is something that is handled
			return false
		}
	}

	return Promise.resolve(false)
}

module.exports = {
	getOrdersByStatus,
	setOrderToUnassigned,
	tryToReleaseDriver,
}
