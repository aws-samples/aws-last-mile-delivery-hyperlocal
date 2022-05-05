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
const logger = require('../utils/logger')
const iot = require('../lib/iot')
const ddb = require('../lib/dynamoDB')
const eventBridge = require('../lib/eventBridge')
const geotracking = require('../lib/geotracking')

const getDriversToNotify = async (segments) => {
	const MAX_DRIVERS_TO_BROADCAST_TO = 30
	const MAX_QUERY_ITERATIONS = 5
	const KM_INCREMENT = 3
	const first = segments.sort((a, b) => a.index - b.index)[0]
	let drivers = []
	let initialKm = 5
	let maxCount = 0

	do {
		/// TODO: this parameters might work for a prototype, they might need to be verified in a path to production
		logger.debug('Querying geotracking service with from lat,long: ', first.from.lat, first.from.long, ' radius (km): ', initialKm, ' status: IDLE')
		const drvs = await geotracking.queryDrivers(first.from.lat, first.from.long, initialKm, 'km', 'IDLE', MAX_DRIVERS_TO_BROADCAST_TO)

		drivers = drivers.concat(drvs)
		initialKm += KM_INCREMENT
	} while (drivers.length < MAX_DRIVERS_TO_BROADCAST_TO && ++maxCount < MAX_QUERY_ITERATIONS)

	/// TODO: for the prototype we get only ONE driver to notify to for the sake of the simulation
	// this is to make it easier to run the end-to-end without having the container to skip orders that won't
	// be able to handle and make it easier to simulate

	logger.debug(`Found ${drivers.length} drivers: `, JSON.stringify(drivers))

	return [drivers[Math.floor(Math.random() * drivers.length)]]

	// PRODUCTION: for a production use-case is correct to notify ALL drivers nearby a certain assignement
	// so that the one that would want to pick the assignment can do.
	// return drivers
}

const execute = async (payload) => {
	logger.info('Sending order to driver for payload')
	logger.info(JSON.stringify(payload))
	const { jobId } = payload
	const results = await ddb.query(config.sameDayDirectPudoDeliveryJobsTable, undefined, { ID: jobId })
	const { segments, route } = results.Items[0]

	try {
		const orderIds = [...new Set(segments.map(q => q.orderId))]
		/// update route for this order
		const promises = orderIds.map((orderId) =>
			ddb.updateItem(config.sameDayDeliveryProviderOrdersTable, orderId, {
				jobId,
				route,
			}),
		)
		await Promise.all(promises)

		const fullObject = {
			jobId,
			segments,
			route,
		}

		const drivers = await getDriversToNotify(segments)
		const driversPromises = drivers.map(q =>
			iot.publishMessage(`${q.driverIdentity}/messages`, {
				type: 'NEW_ASSIGNMENT',
				payload: fullObject,
			}),
		)

		await Promise.all(driversPromises)
		await eventBridge.putEvent('ORDER_FULFILLED', fullObject)
	} catch (err) {
		logger.error('Error on routing a job to the driver, will be skipped')
		logger.error(err)
	}

	return { success: true }
}

module.exports = {
	execute,
}
