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
const { REDIS_HASH, OPENSEARCH } = require('/opt/lambda-utils')
const { getRedisClient } = require('/opt/redis-client')
const { getOpenSearchClient } = require('/opt/opensearch-client')

const openSearchClient = getOpenSearchClient(`https://${process.env.DOMAIN_ENDPOINT}`)

const {
	DRIVER_LOCATION, DRIVER_LOCATION_TTLS, DRIVER_LOCATION_RAW,
	DRIVER_STATUS, DRIVER_STATUS_UPDATED_AT,
} = REDIS_HASH

const OFFLINE = 'OFFLINE'

const handler = async () => {
	const redisClient = await getRedisClient()
	// ZRANGEBYSCORE
	let driverIds = []
	const now = Date.now()

	try {
		console.debug('retrieving all drivers who have not updated their status until TTL', now)
		driverIds = await redisClient.zRangeByScore(DRIVER_LOCATION_TTLS, '-inf', now)

		// console.debug(`Drivers who expired: ${JSON.stringify(driverIds)}`)
		console.debug(`${driverIds.length} drivers expired`)
	} catch (err) {
		console.error('Error while retrieving expired drivers: ', err)

		return
	}

	if (driverIds.length === 0) {
		return
	}

	try {
		// ZREMRANGEBYSCORE
		// remove them from the TTLS
		await redisClient.zRemRangeByScore(DRIVER_LOCATION_TTLS, '-inf', now)

		const chunks = 200

		const itLen = Math.floor(driverIds.length / chunks) + 1
		for (let i = 0; i < itLen; i++) {
			const tmpIds = driverIds.slice(i * chunks, (i + 1) * chunks)
			// ZREM
			// remove drivers from DRIVER_LOCATION sorted set
			await redisClient.zRem(DRIVER_LOCATION, tmpIds) // driverIds)

			// remove drivers from DRIVER_LOCATION_RAW hash
			await redisClient.hDel(DRIVER_LOCATION_RAW, tmpIds) // driverIds)

			// -------------------------------------------------------------------------------------------------------------
			// // this section updates the driver status to OFFLINE and also the status timestamp
			// // in PROD it's better to use this format instead of removing
			// // in PROTOTYPE we remove it because driverIds are constantly changing and not persisted at all

			// // build array to pass to HSET for multiple field/value pairs
			// const driverStatusParam = driverIds.reduce((prev, curr) => ([...prev, curr, OFFLINE]), [])
			// const driverStatusUpdatedAtParam = driverIds.reduce((prev, curr) => ([...prev, curr, Date.now()]), [])

			// // update driver status and timestamp
			// await redisClient.hSet(DRIVER_STATUS, driverStatusParam)
			// await redisClient.hSet(DRIVER_STATUS_UPDATED_AT, driverStatusUpdatedAtParam)

			// now we remove them from status hashes as well
			// remove driver status and timestamp
			await redisClient.hDel(DRIVER_STATUS, tmpIds) // driverIds)
			await redisClient.hDel(DRIVER_STATUS_UPDATED_AT, tmpIds) // driverIds)
			// -------------------------------------------------------------------------------------------------------------

			console.log(`Removed ${tmpIds.length} items from redis. Iteration ${i + 1} with chunk size of ${chunks}`)
		}

		// // -------------------------------------------------------------------------------------------------------------
		// // same applies to OPENSEARCH
		// await openSearchClient.updateByQuery({
		// 	index: OPENSEARCH.DRIVER_LOCATION_INDEX,
		// 	type: '_doc',
		// 	refresh: true,
		// 	body: {
		// 		script: {
		// 			status: 'OFFLINE',
		// 		},
		// 		query: {
		// 			range: {
		//				ttl: { lte: now },
		// 				// _id: driverIds,
		// 			},
		// 		},
		// 	},
		// })

		await openSearchClient.deleteByQuery({
			index: OPENSEARCH.DRIVER_LOCATION_INDEX,
			type: '_doc',
			body: {
				query: {
					range: {
						ttl: {
							lte: now,
						},
					},
					// _id: driverIds,
				},
			},
		})
		// -------------------------------------------------------------------------------------------------------------
	} catch (err) {
		console.error('Error removing key from MemoryDB: ', err)
	}
	console.debug(`Successfully removed all expired drivers from ${DRIVER_LOCATION}/${DRIVER_LOCATION_RAW}/${DRIVER_LOCATION_TTLS}`)
}

exports.handler = handler
