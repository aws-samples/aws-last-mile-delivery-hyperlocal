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
const { success, fail, REDIS_HASH } = require('/opt/lambda-utils')
const logger = require('../utils/logger')
const redis = require('../lib/redis').default
const eventBridge = require('../lib/eventBridge')

const { GEOFENCE_LOCATION, GEOFENCE_DRIVER, GEOFENCE_LOCATION_STATUS } = REDIS_HASH

module.exports.default = async (event) => {
	let { body } = event

	if (typeof body === 'string' || body instanceof String) {
		body = JSON.parse(body)
	}

	const { lat, long, radius, driverId, prefix } = body

	if (!lat || !long || !radius || !driverId || !prefix) {
		return fail({ error: 'lat/long/radius/driverId/prefix are all required fields' }, 400)
	}

	try {
		const geofenceId = `${prefix}::${uuidv4()}`

		const geofences = await redis.hget(GEOFENCE_DRIVER, driverId)
		// scomma separated list of geofenceId
		let geofenceCommaSeparatedList = geofenceId

		if (geofences !== null) {
			const list = geofences.split(',')
			list.push(geofenceId)

			geofenceCommaSeparatedList = list.join(',')
		}

		await redis.hset(GEOFENCE_DRIVER, driverId, geofenceCommaSeparatedList)
		// [state],[radious],[driverId]
		// state:
		//   - 0 = not close to geofence
		//   - 1 = enter geofence
		//   - 2 = exit geofence
		await redis.hset(GEOFENCE_LOCATION_STATUS, geofenceId, `0,${radius},${driverId}`)
		await redis.geoadd(GEOFENCE_LOCATION, long, lat, geofenceId)

		await eventBridge.putEvent('GEOFENCE_START', {
			id: geofenceId,
			lat,
			long,
			radius,
			driverId,
		})

		return success({ id: geofenceId })
	} catch (err) {
		logger.error('Error while creating geofencing')
		logger.error(err)

		return fail({ error: 'Error while creating the geofencing' })
	}
}
