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
const lambda = require('../lib/lambda')

const mapDriverStatusToOrderStatus = (driverStatus) => {
	switch (driverStatus) {
		case 'ACCEPTED':
			return 'DRIVER_ASSIGNED'
		default:
			return driverStatus
	}
}

const handleGeofenceInvocation = async (event, order) => {
	const { orderId, driverId, status } = event

	if (driverId && (status === 'PICKING_UP_GOODS' || status === 'DELIVERING')) {
		const subtype = status === 'PICKING_UP_GOODS' ? 'restaurant' : 'customer'

		await lambda.invoke(config.geofencingArn, {
			httpMethod: 'POST',
			body: {
				prefix: `order::${orderId}::${subtype}`,
				lat: order[subtype].lat,
				long: order[subtype].long,
				/// TODO: configure, in meters
				radius: 100,
				driverId,
			},
		})
	}
}

const execute = async (event) => {
	logger.info('Updating order with ID: ', event.orderId)

	// event from EventBus, to update dynamoDB
	if (!event.orderId) {
		return utils.fail({ error: 'Status change not related to an order, skipping' }, 400)
	}

	const result = await ddb.get(config.orderTableName, event.orderId)

	if (!result.Item) {
		return utils.fail({ message: `Order with ID ${event.orderId} was not found` }, 400)
	}

	// cancellation events will not contain the driver information
	// thus to avoid exception will conditionally add them to the update query
	const updatedInfo = {
		...(event.driverId ? { driverId: event.driverId } : {}),
		...(event.driverIdentity ? { driverIdentity: event.driverIdentity } : {}),
		state: mapDriverStatusToOrderStatus(event.status),
	}

	await ddb.updateItem(config.orderTableName, event.orderId, updatedInfo)
	await events.putEvent('ORDER_UPDATE', {
		...result.Item,
		...updatedInfo,
	})

	await handleGeofenceInvocation(event, result.Item)

	return utils.success({
		data: result.Item,
	})
}

module.exports = {
	execute,
}
