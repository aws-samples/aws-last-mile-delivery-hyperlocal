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
const { getRedisClient } = require('/opt/redis-client')
const { success, fail, REDIS_HASH } = require('/opt/lambda-utils')

const { DRIVER_LOCATION, DRIVER_LOCATION_RAW } = REDIS_HASH

const handler = async (event) => {
	const redisClient = await getRedisClient()
	const driverId = event.pathParameters ? event.pathParameters.driverId : undefined

	console.log(`:: get-driver-location :: GET :: driverId = ${driverId}`)

	if (driverId == null) {
		console.warn(':: get-driver-location :: GET :: driverId not set')

		return fail({ message: 'No driverId set' }, 404)
	}

	try {
		// const driverLocation = await redisClient.geoPos(DRIVER_LOCATION, driverId)

		// if (driverLocation == null) {
		// 	return fail({ message: 'Driver not found' }, 404)
		// }
		// console.debug(`:: get-driver-location :: GET :: Driver location :: lat = ${driverLocation[1]} :: long = ${driverLocation[0]}`)

		// return success({ lat: driverLocation[1], long: driverLocation[0], driverId })

		const driverData = await redisClient.hGet(DRIVER_LOCATION_RAW, driverId)

		if (driverData == null) {
			return fail({ message: 'Driver not found' }, 404)
		}

		console.debug(`:: get-driver-location :: GET :: result = ${driverData}`)

		return success(JSON.parse(driverData))
	} catch (err) {
		console.error(`Error while retreiving driver location: ${JSON.stringify(err)}`)

		return fail({ message: `Error while retreiving driver location: ${JSON.stringify(err)}` })
	}
}

exports.handler = handler
