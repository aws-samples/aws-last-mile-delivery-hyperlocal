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
const { getRedisClient } = require('/opt/redis-client')
const { getESClient } = require('/opt/es-client')
const { success, fail, REDIS_HASH, DRIVERAPP_MESSAGE_TYPE, ES } = require('/opt/lambda-utils')

const { DRIVER_LOCATION, DRIVER_LOCATION_TTLS, DRIVER_LOCATION_RAW } = REDIS_HASH
const TTL = parseInt(process.env.DRIVER_LOCATION_UPDATE_TTL_MS, 10) // 2 * 60 * 1000 // 2 minutes == 120000ms

const redisClient = getRedisClient()
redisClient.geoadd = promisify(redisClient.geoadd)
redisClient.zadd = promisify(redisClient.zadd)
redisClient.hset = promisify(redisClient.hset)

const esClient = getESClient(`https://${process.env.DOMAIN_ENDPOINT}`)

const handler = async (event, context) => {
	if (event.Records === undefined) {
		return context.fail(`'Records' not found in event object: ${JSON.stringify(event)}`)
	}

	const { Records } = event

	let data
	let kinesisData
	const dataArr = []
	for (const record of Records) {
		try {
			// Kinesis data is base64 encoded so decode here
			kinesisData = Buffer.from(record.kinesis.data, 'base64').toString('utf-8')
			data = JSON.parse(kinesisData)

			console.debug(`Data payload: ${JSON.stringify(data, null, 2)}`) // TODO: remove this for PROD
		} catch (err) {
			console.error(`Record from kinesis is malformatted (JSON parse failure). Skipping. Data received: ${kinesisData}`)
			continue
		}

		if (!recordValid(data)) {
			console.error(`Record from kinesis is not valid. Skipping. Data received: ${JSON.stringify(data)}`)
			continue
		}

		if (data.type !== DRIVERAPP_MESSAGE_TYPE.LOCATION_UPDATE) {
			console.error('Record is not a LOCATION_UPDATE message. Skipping...')
			continue
		}

		// transform data to have it available in bulk updates

		const { type, locations, ...origRaw } = data

		if (!Array.isArray(locations) || locations.length === 0) {
			console.error('locations empty in LOCATION_UPDATE update. Skipping...')
			continue
		}
		// sort by timestamp DESC
		data.locations.sort((l1, l2) => l2.timestamp - l1.timestamp)

		const latestLocation = locations[0]
		// build raw object to store
		const raw = { ...origRaw, ...latestLocation }

		const { latitude, longitude, ...esRaw } = raw

		dataArr.push({
			latestLocation,
			driverId: origRaw.driverId,
			raw,
			esRaw,
		})
	}

	try {
		let result

		// update driver locations in redis
		const geoaddParams = dataArr.flatMap(data =>
			[data.latestLocation.longitude, data.latestLocation.latitude, data.driverId])
		result = await redisClient.geoadd(DRIVER_LOCATION, geoaddParams)

		// update driver update TTL in redis
		const zaddParams = dataArr.flatMap(data => [data.latestLocation.timestamp + TTL, data.driverId])
		result = await redisClient.zadd(DRIVER_LOCATION_TTLS, zaddParams)

		// update raw update data in redis
		const hsetParams = dataArr.flatMap(data => [data.driverId, JSON.stringify(data.raw)])
		result = await redisClient.hset(DRIVER_LOCATION_RAW, hsetParams)
	} catch (err) {
		console.error(`Error updating Elasticache :: ${JSON.stringify(err)}`)
		console.error(err)
	}

	try {
		const body = dataArr.flatMap(data => [
			{ index: { _index: ES.DRIVER_LOCATION_INDEX, _id: data.driverId } },
			{
				ttl: data.latestLocation.timestamp + TTL,
				location: {
					lat: data.latestLocation.latitude,
					lon: data.latestLocation.longitude,
				},
				...data.esRaw,
			},
		])

		const { body: bulkResponse } = await esClient.bulk({ body })

		if (bulkResponse.errors) {
			const erroredDocuments = []
			// The items array has the same order of the dataset we just indexed.
			// The presence of the `error` key indicates that the operation
			// that we did for the document has failed.
			bulkResponse.items.forEach((action, i) => {
				const operation = Object.keys(action)[0]

				if (action[operation].error) {
					erroredDocuments.push({
					// If the status is 429 it means that you can retry the document,
					// otherwise it's very likely a mapping error, and you should
					// fix the document before to try it again.
						status: action[operation].status,
						error: action[operation].error,
						operation: body[i * 2],
						document: body[i * 2 + 1],
					})
				}
			})
			console.error(erroredDocuments)
		}
	} catch (err) {
		console.error(`Error updating ElasticSearch :: ${JSON.stringify(err)}`)
		console.error(err)
	}
}

const recordValid = (record) => {
	return !(record.type == null || record.driverId == null)
}
exports.handler = handler
