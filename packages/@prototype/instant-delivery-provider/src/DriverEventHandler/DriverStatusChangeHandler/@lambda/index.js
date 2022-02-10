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
const eventBridge = require('./lib/eventBridge')
const callbackTrigger = require('./callbackTrigger')

const STATUS = {
	IDLE: 'IDLE',
	CANCELLED: 'CANCELLED',
	REJECTED: 'REJECTED',
	UNASSIGNED: 'UNASSIGNED',
}

const handler = async (event, context) => {
	console.log('Incoming event: ')
	console.log(JSON.stringify(event))
	const message = event.detail
	const {
		driverId,
		driverIdentity,
		status,
		orderId,
		type,
	} = message

	if (type !== 'STATUS_CHANGE') {
		console.log(`Event type "${type}" not support`)

		return
	}

	if (status === STATUS.IDLE || !orderId) {
		console.log('Event not relevant to an order, skipping')

		return
	}

	const order = await ddb.get(config.instantDeliveryProviderOrders, orderId)

	if (!order.Item) {
		console.error('[ERROR]: Order cannot be found in the db')
		try {
			await eventBridge.putEvent('UNEXPECTED_ERROR', {
				type: 'MISSING_ORDER',
				message: 'Driver trying to report event information for a not existing order',
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

		await ddb.updateItem(
			config.instantDeliveryProviderOrders,
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
			console.info('Sending callback to the instant delivery provider')
			const res = await callbackTrigger.sendCallback(message)

			console.log('Callback response: ', JSON.stringify(res))
		}
	} catch (err) {
		console.error('[ERROR]: Unable to update the order for the given driver')
		console.error(err)
	}

	return { success: true }
}

exports.handler = handler
