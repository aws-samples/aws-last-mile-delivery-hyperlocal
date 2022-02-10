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
const config = require('../config')
const constants = require('../config/constants')
const logger = require('../utils/logger')
const iot = require('../lib/iot')
const ddb = require('../lib/dynamoDB')
const eventBridge = require('../lib/eventBridge')
const routing = require('../lib/routing')

const execute = async (payload) => {
	logger.info('Sending order to driver for payload')
	logger.info(JSON.stringify(payload))
	const { driverId, driverIdentity, driverLocation, orders } = payload

	for (const order of orders) {
		try {
			const routes = await routing.getRoutingDetails(driverLocation, order)

			const fullObject = {
				driverId,
				driverIdentity,
				...order,
				routing: routes,
			}

			await ddb.updateItem(config.providerOrdersTable, order.orderId, {
				routing: routes,
			}, {
				driverId,
				status: constants.ASSIGNED,
			})

			await iot.publishMessage(`${driverIdentity}/messages`, {
				type: 'NEW_ORDER',
				payload: fullObject,
			})

			await eventBridge.putEvent('ORDER_FULFILLED', fullObject)
			// update the routing details in the order table
		} catch (err) {
			logger.error('Error on routing an order to the driver, will be skipped')
			logger.error(err)

			continue
		}
	}

	return { success: true }
}

module.exports = {
	execute,
}
