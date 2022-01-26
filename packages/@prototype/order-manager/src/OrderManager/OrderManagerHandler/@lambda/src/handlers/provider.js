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
const { getRedisClient } = require('/opt/redis-client')
const { REDIS_HASH } = require('/opt/lambda-utils')

const {
	ORDER_MANAGER,
} = REDIS_HASH

const client = getRedisClient()

client.hget = promisify(client.hget)
client.hdel = promisify(client.hdel)

const mapper = {
	ORDER_UPDATE: async (detail) => {
		const { orderId, status } = detail

		logger.info('Sending task success with the following status:', status)

		const token = await client.hget(`${ORDER_MANAGER}:token`, orderId)
		const state = await client.hget(`${ORDER_MANAGER}:state`, orderId)

		if (!token) {
			logger.error('CRITICAL! Missing token for orderId: ', orderId)

			return { success: false }
		}

		if (state !== 'ORDER_STATUS') {
			logger.error('Step Function state is not in ORDER_STATUS for order: ', orderId)

			await steps.sendTaskFailure({}, token)

			return { success: false }
		}

		// no longer required as they have been used

		await client.hdel(`${ORDER_MANAGER}:token`, orderId)
		await client.hdel(`${ORDER_MANAGER}:state`, orderId)

		await steps.sendTaskSuccess({
			orderStatus: status,
		}, token)

		return { success: true }
	},
}

const execute = (providerName) => async (detailType, detail) => {
	if (!mapper[detailType]) {
		logger.warn(`Mapper not found for builder '${providerName}' service handler and detailType '${detailType}'`)

		return
	}

	logger.info(`Executing build provider '${providerName}' handler for detailType '${detailType}'`)

	return mapper[detailType](detail)
}

module.exports = {
	execute,
}
