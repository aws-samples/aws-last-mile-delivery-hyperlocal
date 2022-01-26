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
const steps = require('../lib/steps')
const config = require('../config')
const { getRedisClient } = require('/opt/redis-client')
const { REDIS_HASH } = require('/opt/lambda-utils')

const {
	ORDER_MANAGER,
} = REDIS_HASH

const client = getRedisClient()

client.hget = promisify(client.hget)
client.hdel = promisify(client.hdel)

const mapper = {
	RESTAURANT_ORDER_ACK: async (detail) => {
		const { orderId, status } = detail

		logger.info('Sending task success with the following status:', status)

		const token = await client.hget(`${ORDER_MANAGER}:token`, orderId)
		const state = await client.hget(`${ORDER_MANAGER}:state`, orderId)

		if (!token) {
			logger.error('CRITICAL! Missing token for orderId: ', orderId)

			return { success: false }
		}

		if (state !== 'NOTIFY_RESTAURANT') {
			logger.error('Step Function state is not in NOTIFY_RESTAURANT for order: ', orderId)

			await steps.sendTaskFailure({}, token)

			return { success: false }
		}

		await steps.sendTaskSuccess({
			restaurantStatus: status,
		}, token)

		// no longer required as they have been used

		await client.hdel(`${ORDER_MANAGER}:token`, orderId)
		await client.hdel(`${ORDER_MANAGER}:state`, orderId)

		return { success: true }
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
