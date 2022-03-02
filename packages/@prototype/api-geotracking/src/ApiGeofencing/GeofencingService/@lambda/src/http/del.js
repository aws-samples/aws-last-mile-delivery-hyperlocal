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
const { fail, success, REDIS_HASH } = require('/opt/lambda-utils')
const { getRedisClient } = require('/opt/redis-client')
const logger = require('../utils/logger')
const eventBridge = require('../lib/eventBridge')

const { GEOFENCE_LOCATION, GEOFENCE_DRIVER, GEOFENCE_LOCATION_STATUS } = REDIS_HASH

module.exports.default = async (event) => {
	const redis = await getRedisClient()
	const geofencingId = event.pathParameters ? event.pathParameters.geofencingId : undefined

	if (!geofencingId) {
		return fail({ error: 'Missing geofencingId parameter' })
	}

	try {
		const status = await redis.hGet(GEOFENCE_LOCATION_STATUS, geofencingId)
		logger.debug('Saved status: ', status)
		// state,radius,driverId
		const driverId = status.split(',')[2]
		const geofencingForDriver = await redis.hGet(GEOFENCE_DRIVER, driverId)
		logger.debug('geofences for driver: ', geofencingForDriver)

		// comma separated geofencing Ids for driverX
		let geofenceIds = geofencingForDriver.split(',')

		if (geofenceIds.includes(geofencingId)) {
			// filter out the current geofencing Id to be removed
			geofenceIds = geofenceIds.filter(g => g !== geofencingId)

			logger.debug('Geofence after delete filter:', geofenceIds)

			if (geofenceIds.length > 0) {
				// if there are still active geofence, then save it inside
				logger.debug('Updating index for driver', driverId, geofenceIds.join(','))
				await redis.hSet(GEOFENCE_DRIVER, driverId, geofenceIds.join(','))
			} else {
				// if the remaining list is empty, delete the geofence list for driver
				logger.debug('Deleting index for driver', driverId)
				await redis.hDel(GEOFENCE_DRIVER, driverId)
			}
		}

		await redis.hDel(GEOFENCE_LOCATION_STATUS, geofencingId)
		await redis.zRem(GEOFENCE_LOCATION, geofencingId)

		await eventBridge.putEvent('GEOFENCE_DELETE', {
			id: geofencingId,
		})

		return success({ success: true })
	} catch (err) {
		logger.error('Error while delete geofence action')
		logger.error(err)

		return fail({ error: 'Error while deleting the geofencing setting' })
	}
}
