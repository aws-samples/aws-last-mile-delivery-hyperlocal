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
const { v4: uuidv4 } = require('uuid')
const routing = require('../lib/routing')
const config = require('../config')
const constants = require('../config/constants')
const ddb = require('../lib/dynamoDB')
const logger = require('../utils/logger')
const iot = require('../lib/iot')
const eventBridge = require('../lib/eventBridge')

const execute = async (payload) => {
	logger.info('Sending order to driver for payload')
	logger.info(JSON.stringify(payload))
	const { driverId, driverIdentity, segments } = payload

	try {
		const points = segments.flatMap((s) => [[s.from.long, s.from.lat], [s.to.long, s.to.lat]])
		const fullRoute = await routing.queryGraphHopper(points)
		const segmentsWithRouting = await Promise.all(segments.map(async (s) => ({
			...s,
			// add routing for each segmenet
			route: await routing.queryGraphHopper([[s.from.long, s.from.lat], [s.to.long, s.to.lat]]),
		})))

		const jobId = uuidv4()
		const fullObject = {
			jobId,
			driverId,
			driverIdentity,
			// add full routing
			route: fullRoute,
			segments: segmentsWithRouting,
		}

		const promises = [...new Set(segments.map(q => q.orderId))].map((orderId) =>
			ddb.updateItem(config.providerOrdersTable, orderId, {
				jobId,
			}, {
				driverId,
				status: constants.ASSIGNED,
			}))
		await Promise.all(promises)

		await iot.publishMessage(`${driverIdentity}/messages`, {
			type: 'NEW_ORDER',
			payload: fullObject,
		})

		await eventBridge.putEvent('ORDER_FULFILLED', fullObject)
		// update the routing details in the order table
	} catch (err) {
		logger.error('Error on routing an order to the driver, will be skipped')
		logger.error(err)
	}

	return { success: true }
}

module.exports = {
	execute,
}
