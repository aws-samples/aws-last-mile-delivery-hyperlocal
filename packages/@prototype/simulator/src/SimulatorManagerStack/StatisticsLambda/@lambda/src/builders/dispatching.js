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

const { DISPATCH_ENGINE_STATS } = REDIS_HASH

const client = getRedisClient()

client.hset = promisify(client.hset)
client.hincrby = promisify(client.hincrby)

const mapper = {
	ORDER_FULFILLED: async (detail) => {
		const { driverId } = detail

		const ordersPerDriver = await client.hincrby(`${DISPATCH_ENGINE_STATS}:ordersPerDriver`, driverId, 1)

		await client.hincrby(`${DISPATCH_ENGINE_STATS}:group`, ordersPerDriver, 1)

		if (ordersPerDriver > 1) {
			/// decrease the driver counter
			/// in the previous group
			await client.hincrby(`${DISPATCH_ENGINE_STATS}:group`, ordersPerDriver - 1, -1)
		}
	},
}

const execute = async (detailType, detail) => {
	if (!mapper[detailType]) {
		logger.warn(`Mapper not found for builder '${config.dispatchEngineService}' and detailType '${detailType}'`)

		return
	}

	logger.info(`Executing build '${config.dispatchEngineService}' for detailType '${detailType}'`)

	return mapper[detailType](detail)
}

module.exports = {
	execute,
}
