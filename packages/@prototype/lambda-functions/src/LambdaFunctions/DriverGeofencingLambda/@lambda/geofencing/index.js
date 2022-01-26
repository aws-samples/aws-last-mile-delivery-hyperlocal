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
const { promisify } = require('util')
const { REDIS_HASH } = require('/opt/lambda-utils')
const { getRedisClient } = require('/opt/redis-client')
const eventBridge = require('../lib/eventBridge')

const { GEOFENCE_LOCATION, GEOFENCE_DRIVER, GEOFENCE_LOCATION_STATUS } = REDIS_HASH

const redisClient = getRedisClient()
redisClient.hget = promisify(redisClient.hget)
redisClient.hset = promisify(redisClient.hset)
redisClient.geoadd = promisify(redisClient.geoadd)
redisClient.geodist = promisify(redisClient.geodist)

const evaluateGeofence = async (driverId, location, geofenceId) => {
	const geofenceStatus = await redisClient.hget(GEOFENCE_LOCATION_STATUS, geofenceId)

	if (!geofenceStatus) {
		console.debug('Missing status for geofence: ', geofenceId)

		return
	}
	console.log('geofence location', JSON.stringify(location))
	const { latitude, longitude } = location
	// state:
	//   - 0 = not close to geofence
	//   - 1 = enter geofence
	//   - 2 = exit geofence
	const [status, rdu, driver] = geofenceStatus.split(',')
	const state = Number(status)
	const radius = Number(rdu)

	if (driver !== driverId) {
		console.error(`Driver in location event is '${driverId}' while in geofence structure is ${driver}`)

		throw new Error('Mismatch between location driver and geofence driver, skipping')
	}

	await redisClient.geoadd(GEOFENCE_LOCATION, longitude, latitude, driverId)
	const dst = await redisClient.geodist(GEOFENCE_LOCATION, geofenceId, driverId)
	const distance = Number(dst)

	console.log(`Distance between ${geofenceId} and ${driverId} = ${distance}m compared to ${radius}`)

	if (distance < radius) {
		console.log('Geofence crossed, evaluating...')

		if (state === 0) {
			console.log('Driver entered the geofence for the first time, updating status and fire eventbridge event')

			// means the driver was far from geofence earlier, thus it just entered
			// change status to 1=enter geofence
			await redisClient.hset(GEOFENCE_LOCATION_STATUS, geofenceId, `1,${radius},${driver}`)
			await eventBridge.putEvent('GEOFENCE_ENTER', {
				id: geofenceId,
				driverId,
				radius,
			})
		} else if (state === 1) {
			console.log('Driver still in the geofence area, nothing to do')
		}
	} else if (distance > radius && state === 1) {
		console.log('Driver exited the geofence, updating status and fire eventbridge event')

		// change status to 1=exit geofence
		await redisClient.hset(GEOFENCE_LOCATION_STATUS, geofenceId, `2,${radius},${driver}`)
		await eventBridge.putEvent('GEOFENCE_EXIT', {
			id: geofenceId,
			driverId,
			radius,
		})
	}
}

const performGeofencing = async (data) => {
	const { driverId, locations } = data
	const activeGeofencesIds = await redisClient.hget(GEOFENCE_DRIVER, driverId)

	if (!activeGeofencesIds) {
		console.warn(`No active geofence for driver ${driverId}, skipping`)

		return -1
	}

	const geofences = activeGeofencesIds.split(',')
	console.debug('geofences', JSON.stringify(geofences))

	if (geofences.length === 0) {
		console.warn(`No geofence active for driver ${driverId}, skipping`)

		return -1
	}

	/// all locations have to be avaluated sequencially to verify if a geofence event happened
	/// drivers could have multiple geofence acrive simulataniously (thus the )
	for (let i = 0; i < locations.length; i++) {
		for (let j = 0; j < geofences.length; j++) {
			await evaluateGeofence(driverId, locations[i], geofences[j])
		}
	}
}

module.exports = {
	performGeofencing,
}
