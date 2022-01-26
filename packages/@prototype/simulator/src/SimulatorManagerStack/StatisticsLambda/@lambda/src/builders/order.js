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
const { promisify } = require('util')
const logger = require('../utils/logger')
const config = require('../config')
const { getRedisClient } = require('/opt/redis-client')
const { REDIS_HASH } = require('/opt/lambda-utils')

const { ORDER_STATUS, PROVIDER_TIME } = REDIS_HASH

const client = getRedisClient()

client.keys = promisify(client.keys)
client.hset = promisify(client.hset)
client.hincrby = promisify(client.hincrby)
client.hdel = promisify(client.hdel)

const mapper = {
	NEW_ORDER: async (detail) => {
		const timestamp = Date.now()
		const { ID, state } = detail

		await client.hset(`${ORDER_STATUS}:all`, ID, timestamp)
		await client.hset(`${ORDER_STATUS}:${state}`, ID, timestamp)
	},
	ORDER_UPDATE: async (detail) => {
		const timestamp = Date.now()
		const { ID, state, provider, assignedAt, updatedAt } = detail
		let statusList = await client.keys(`${ORDER_STATUS}:*`)
		statusList = (statusList || []).map(q => q.split(':').pop())

		if (statusList.length === 0) {
			statusList = [state]
		}

		if (!statusList.includes(state)) {
			statusList.push(state)
		}

		const promises = statusList.filter(q => q !== 'all').map((s) => {
			if (s === state) {
				return client.hset(`${ORDER_STATUS}:${s}`, ID, timestamp)
			}

			return client.hdel(`${ORDER_STATUS}:${s}`, ID)
		})

		await Promise.all(promises)

		// If order has been delivered then add the count and sum duration
		if (state === 'DELIVERED') {
			await client.hincrby(`${PROVIDER_TIME}:${provider}`, 'orders', 1)
			await client.hincrby(`${PROVIDER_TIME}:${provider}`, 'duration', (updatedAt - assignedAt))
		}
	},
}

const execute = async (detailType, detail) => {
	if (!mapper[detailType]) {
		logger.warn(`Mapper not found for builder '${config.orderService}' and detailType '${detailType}'`)

		return
	}

	logger.info(`Executing build '${config.orderService}' for detailType '${detailType}'`)

	return mapper[detailType](detail)
}

module.exports = {
	execute,
}
