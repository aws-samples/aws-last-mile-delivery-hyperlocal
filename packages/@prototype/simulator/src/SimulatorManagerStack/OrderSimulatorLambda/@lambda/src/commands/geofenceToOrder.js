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
const utils = require('../utils')
const logger = require('../utils/logger')
const ddb = require('../lib/dynamoDB')
const config = require('../config')
const events = require('../lib/eventBridge')

const execute = async (event) => {
	logger.info('Geofence from eventbridge: ', event)
	const { id, driverId } = event
	// pattern order::[order-id]::origin|destination::geofenceId
	const [service, orderId, type, geofenceId] = id.split('::')

	logger.debug('Incoming ID parts', service, orderId, type, geofenceId)

	// event from EventBus, to update dynamoDB
	if (service !== 'order' && !orderId) {
		logger.warn('Event not for order, skipping. ', service, orderId)

		return utils.fail({ error: 'Event not for order, skipping' }, 400)
	}

	const result = await ddb.get(config.orderTableName, orderId)
	const order = result.Item

	if (!order) {
		logger.warn('Order not found. ID:', orderId)

		return utils.fail({ message: `Order with ID ${orderId} was not found` }, 400)
	}

	if (order.driverId !== driverId) {
		logger.warn('Order driver and event driver are different:', order.driverId, driverId)

		return utils.fail({ message: `Order with ID ${orderId} has a different driver compared to the eventbridge event` }, 400)
	}

	const updatedInfo = {
		[type]: {
			...order[type],
			geofenceId: id,
		},
	}

	await ddb.updateItem(config.orderTableName, orderId, updatedInfo)
	await events.putEvent('ORDER_UPDATE', {
		...order,
		...updatedInfo,
	})

	return utils.success({
		data: order,
	})
}

module.exports = {
	execute,
}
