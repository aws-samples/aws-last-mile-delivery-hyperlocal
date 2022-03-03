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
const geocluster = require('geocluster')

const { DRIVER_LOCATION, DRIVER_LOCATION_RAW } = REDIS_HASH

const handler = async (event) => {
	switch (event.httpMethod) {
		case 'GET': return handleGET(event)
		case 'POST': return handlePOST(event)
		default: {
			return fail({ error: `${event.httpMethod} not supported` })
		}
	}
}

const handleGET = async (event) => {
	const redisClient = await getRedisClient()
	const { distance, distanceUnit = 'm', lat, long, shape = 'circle', status, count } = event.queryStringParameters

	try {
		// geosearch only works with Redis engine 6.2 and above
		// 2021-03-31 :: current engine in Elasticache is 6.0.5
		// -------------------------------------------------------------------------------------------------------------------
		// const fromlonlat = ['FROMLONLAT', long, lat]
		// const byshape = shape === 'circle' ?
		// 							 ['BYRADIUS', distance, distanceUnit] : ['BYBOX', distance, distance, distanceUnit]
		// const searchResult = await redisClient.geoSearch(DRIVER_LOCATION, [...fromlonlat, ...byshape, 'ASC', 'WITHDIST'])
		// -------------------------------------------------------------------------------------------------------------------
		// return maximum 25 items if not specified differently
		const maxResult = count || 25
		const searchResult = await redisClient.sendCommand([
			'GEORADIUS',
			DRIVER_LOCATION,
			long,
			lat,
			distance,
			distanceUnit,
			'WITHDIST',
			'COUNT',
			maxResult,
			'ASC',
		])
		const driverIds = searchResult.map(res => res[0])

		if (driverIds.length === 0) {
			return success([])
		}

		const distByDriverId = searchResult.reduce((prev, curr) => ({ ...prev, [curr[0]]: curr[1] }), {})

		// drivers --> raw string[]
		let drivers = await redisClient.hmGet(DRIVER_LOCATION_RAW, driverIds)

		// remove nils if any
		drivers = drivers.filter(d => d != null)

		// convert to driver objects
		drivers = drivers.map(d => JSON.parse(d))

		// filter by status if set
		if (status != null) {
			drivers = drivers.filter(d => d.status === status)
		}

		// add distance
		drivers = drivers.map(d => ({ distance: distByDriverId[d.driverId], distanceUnit, ...d }))

		return success(drivers)
	} catch (err) {
		console.error(`Error while querying drivers: ${JSON.stringify(err)}`)

		return fail({ message: `Error while querying drivers: ${JSON.stringify(err)}` })
	}
}

const handlePOST = async (event) => {
	let { body } = event

	if (typeof body === 'string' || body instanceof String) {
		body = JSON.parse(body)
	}

	const { distance, distanceUnit = 'm', locations, shape = 'circle', status, countPerLocation } = body

	const coords = locations.map(l => [l.lat, l.long])
	const clustered = geocluster(coords, 1.5)

	console.log(`${locations.length} locations split to ${clustered.length} clusters.`)

	const driversById = {}
	const redisClient = await getRedisClient()

	try {
		for (const cluster of clustered) {
			const { centroid, elements } = cluster
			let driversPerLocation = []
			let iteration = 0
			do {
				const searchResult = await redisClient.sendCommand(
					'GEORADIUS',
					DRIVER_LOCATION,
					centroid[1], // location.long,
					centroid[0], // location.lat,
					distance + (iteration * distance),
					distanceUnit,
					'WITHDIST',
					'COUNT',
					elements.length + 5,
					'ASC',
				)
				const driverIds = searchResult.map(res => res[0])

				if (driverIds.length === 0) {
					iteration++
					continue
				}

				const distByDriverId = searchResult.reduce((prev, curr) => ({ ...prev, [curr[0]]: curr[1] }), {})
				driversPerLocation = await redisClient.hmGet(DRIVER_LOCATION_RAW, driverIds)

				// remove nils if any
				driversPerLocation = driversPerLocation.filter(d => d != null)

				// convert to driver objects
				driversPerLocation = driversPerLocation.map(d => JSON.parse(d))

				// filter by status if set
				if (status != null) {
					driversPerLocation = driversPerLocation.filter(d => d.status === status)
				}

				// add distance
				driversPerLocation = driversPerLocation.map(d => ({ distance: distByDriverId[d.driverId], distanceUnit, ...d }))

				iteration++
			} while (driversPerLocation.length < elements.length) // countPerLocation)

			// driversPerLocation.slice(0, countPerLocation).forEach(d => {
			driversPerLocation.forEach(d => {
				driversById[d.driverId] = d
			})
		}

		const drivers = Object.values(driversById)

		return success(drivers)
	} catch (err) {
		console.error(`Error while querying drivers: ${JSON.stringify(err)}`)
		console.error(err)

		return fail({ message: `Error while querying drivers: ${JSON.stringify(err)}` })
	}
}

exports.handler = handler
