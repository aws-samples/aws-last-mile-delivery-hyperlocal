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
const ddb = require('./lib/dynamoDB')
const config = require('./config')
const constants = require('./config/constants')
const helper = require('./helper')

const updateOrderAndReleaseDriver = async (order, prevStatus) => {
	const orderId = order.ID
	const driverItem = await ddb.get(config.internalProviderLocks, order.driverId)
	const driver = driverItem.Item

	if (!driver) {
		console.warn('Cannot find the driver!')
	}

	console.debug(`Updating order ${orderId} to UNASSIGNED`)

	await helper.setOrderToUnassigned(orderId, prevStatus)

	console.debug(`Updating driver lock for driver ${order.driverId}`)

	await helper.tryToReleaseDriver(driver, orderId)

	console.debug(`Sending order ${orderId} back to the stream`)

	await helper.sendOrderBackToKinesis(order)
}

const releaseOrderIfExpired = async (order) => {
	const now = Date.now()
	const timeoutMs = config.driverAcknowledgeTimeoutInSeconds * 1000

	// use assignedAt as it's the date of when the driver will get ASSIGNED to the order
	if (order.assignedAt && order.assignedAt + timeoutMs < now) {
		await updateOrderAndReleaseDriver(order, constants.STATES.ASSIGNED)
	}
}

const unlockDriverIfAllDelivered = async (order) => {
	const orderId = order.ID
	const driverItem = await ddb.get(config.internalProviderLocks, order.driverId)
	const driver = driverItem.Item

	if (!driver) {
		console.warn('Cannot find the driver!')

		return
	}

	await helper.tryToReleaseDriver(driver, orderId)
}

const handler = async (event, context) => {
	console.log('Incoming event (driver cleanup): ')
	console.log(JSON.stringify(event))

	console.log('Retrieve ASSIGNED orders')
	const assignedOrders = await helper.getOrdersByStatus(constants.STATES.ASSIGNED)

	if (assignedOrders.Items && assignedOrders.Items.length > 0) {
		console.info(`Processing ${assignedOrders.Items.length} ASSIGNED orders`)

		const promises = assignedOrders.Items.map(releaseOrderIfExpired)

		await Promise.all(promises)
	}

	console.log('Retrieve DELIVERED orders')
	const deliveredOrders = await helper.getOrdersByStatus(constants.STATES.DELIVERED)

	if (deliveredOrders.Items && deliveredOrders.Items.length > 0) {
		console.info(`Processing ${deliveredOrders.Items.length} DELIVERED orders`)

		const promises = deliveredOrders.Items.map(unlockDriverIfAllDelivered)

		await Promise.all(promises)
	}

	console.log('Retrieving REJECTED orders')
	const rejectedOrders = await helper.getOrdersByStatus(constants.STATES.REJECTED)

	if (rejectedOrders.Items && rejectedOrders.Items.length > 0) {
		console.info(`Processing ${rejectedOrders.Items.length} REJECTED orders`)

		const promises = rejectedOrders.Items.map((order) => updateOrderAndReleaseDriver(order, constants.STATES.REJECTED))

		await Promise.all(promises)
	}

	console.log('Completed')

	return { success: true }
}

exports.handler = handler
