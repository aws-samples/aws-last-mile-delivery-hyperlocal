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
const config = require('./config')
const ddb = require('./lib/dynamoDB')
const iot = require('./lib/iot')
const eventBridge = require('./lib/eventBridge')
const callbackTrigger = require('./callbackTrigger')

const STATUS = {
	IDLE: 'IDLE',
	ASSIGNED: 'ASSIGNED',
	ACCEPTED: 'ACCEPTED',
	CANCELLED: 'CANCELLED',
	REJECTED: 'REJECTED',
	UNASSIGNED: 'UNASSIGNED',
}

const updateSingleOrder = async (message) => {
	const { orderId, driverId, driverIdentity, status } = message

	await ddb.updateItem(
		config.sameDayDeliveryProviderOrders,
		orderId,
		{
			status,
			driverId,
			driverIdentity,
		},
		{
			driverId,
		},
	)

	// Does not send a callback if the status is rejected as the cleanup function
	// will place the order back in the Kinesis stream and release the driver
	// if is not assigned for too long it will send a cancellation from the step function workflow
	if (status !== STATUS.REJECTED) {
		console.info('Sending callback to the same day delivery provider')
		const res = await callbackTrigger.sendCallback(message)

		console.log('Callback response: ', JSON.stringify(res))
	}
}

const tryUnlockDriver = async (driverId) => {
	try {
		await ddb.updateItem(config.sameDayDeliveryProviderLocksTable, driverId, {
			locked: false,
		}, {
			locked: true,
		}, ['orders'])
	} catch (err) {
		console.warn('Error unlocking the driver, could be already in a unlocked state.')
		console.warn(err)
	}
}

const lockDriver = async (driverId, ordersId) => {
	const lock = await ddb.get(config.sameDayDeliveryProviderLocksTable, driverId)

	if (lock.Item) {
		await ddb.updateItem(config.sameDayDeliveryProviderLocksTable, driverId, {
			locked: true,
			orders: ordersId,
		}, {
			locked: false,
		})
	} else {
		await ddb.putItem(config.sameDayDeliveryProviderLocksTable, {
			ID: driverId,
			locked: true,
			orders: ordersId,
		})
	}
}

// TODO: use batch operation
const lockOrderToDriver = (driverId, driverIdentity, orderId) =>
	ddb.updateItem(config.sameDayDeliveryProviderOrders, orderId, {
		status: STATUS.ASSIGNED,
		driverId,
		driverIdentity,
		assignedAt: Date.now(),
	}, {
		status: STATUS.UNASSIGNED,
	})

const handler = async (event, context) => {
	console.log('Incoming event: ')
	console.log(JSON.stringify(event))
	const message = event.detail
	const {
		driverId,
		driverIdentity,
		status,
		jobId,
		orderId,
		type,
	} = message

	if (type !== 'STATUS_CHANGE') {
		console.log(`Event type "${type}" not support`)

		return
	}

	if (status === STATUS.IDLE) {
		console.error('Event not relevant to an order, skipping')

		return
	}

	if (!jobId) {
		console.warn('Event does not contain job information')

		return
	}

	const orders = await ddb.query(
		config.sameDayDeliveryProviderOrders,
		config.sameDayDeliveryProviderOrdersJobIdIndex,
		{
			jobId,
		},
	)

	if (!orders || !orders.Items || !orders.Items.length === 0) {
		console.warn(`Job ${jobId} does not contain any data in the same day delivery provider. Skipping`)

		return
	}

	// if the event is related to driver ACCEPTED a job then will lock to avoid concurrency
	if (!orderId && status === STATUS.ACCEPTED) {
		console.info(`Processing ${orders.Items.length} orders associated to job: ${jobId}`)

		const ordersId = orders.Items.map(q => q.ID)

		// lock all orders
		try {
			await lockDriver(driverId, ordersId)
			await Promise.all(ordersId.map(oId => lockOrderToDriver(driverId, driverIdentity, oId)))

			await iot.publishMessage(`${driverIdentity}/messages`, {
				type: 'CONFIRM_ASSIGNMENT',
				payload: {
					ordersId,
					jobId,
					driverId,
					driverIdentity,
				},
			})

			await iot.publishMessage('broadcast', {
				type: 'JOB_ASSIGNED',
				payload: {
					driverId,
					jobId,
				},
			})
		} catch (err) {
			console.error('Error locking the orders: ', ordersId, ' might be locked by another driver')
			console.error(err)

			await tryUnlockDriver(driverId)
			await iot.publishMessage(`${driverIdentity}/messages`, {
				type: 'REJECT_ASSIGNMENT',
				payload: {
					ordersId,
					jobId,
					driverId,
					driverIdentity,
				},
			})

			return
		}
	}

	// update single orders
	if (!orderId) {
		// update the status one by one
		await Promise.all(orders.Items.map((order) => updateSingleOrder({
			...message,
			orderId: order.ID,
		})))

		return { success: true }
	}

	const order = await ddb.get(config.sameDayDeliveryProviderOrders, orderId)

	if (!order.Item) {
		console.warn(`Order with id ${orderId} is not associated to this provider. Skipping`)

		return
	}

	if (order.Item.driverId !== driverId) {
		console.error('[ERROR]: The order has been somehow assigned to another driver or the driver doen not match!')

		try {
			await eventBridge.putEvent('UNEXPECTED_ERROR', {
				type: 'DRIVER_MISMATCH',
				message: 'Driver trying to report event information for an order not assigned to them',
				orderId,
				driverId,
				event,
			})
		} catch (err) {
			console.error('Error sending message to event bridge')
			console.error(err)
		}

		return
	}

	if (order.Item.status === STATUS.CANCELLED) {
		console.warn('[Error]: Order has been cancelled meanwhile!')

		await eventBridge.putEvent('UNEXPECTED_ERROR', {
			type: 'CANCELLED_ORDER',
			message: 'Driver trying to report event information for an order that has been cancelled',
			orderId,
			driverId,
			event,
		})

		// TODO: need to handle this and send a cancellation to the driver so it won't hanle this order any longer
		return
	}

	try {
		console.info('Updating order with the new status')

		await updateSingleOrder(message)
	} catch (err) {
		console.error('[ERROR]: Unable to update the order for the given driver')
		console.error(err)
	}

	return { success: true }
}

exports.handler = handler
