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
const logger = require('../utils/logger')
const { getRedisClient } = require('/opt/redis-client')
const { REDIS_HASH } = require('/opt/lambda-utils')

const { PROVIDER_DISTRIBUTION, PROVIDER_ERRORS } = REDIS_HASH

const mapper = {
	UNEXPECTED_ERROR: async (providerName, detail) => {
		const client = await getRedisClient()
		const { type } = detail

		if (type) {
			await client.hIncrBy(`${PROVIDER_ERRORS}:${providerName}`, type, 1)
		}

		await client.hIncrBy(`${PROVIDER_ERRORS}:${providerName}`, 'all', 1)
	},
	ORDER_FULFILLMENT_REQUESTED: async (providerName, detail) => {
		const client = await getRedisClient()
		const timestamp = Date.now()
		const { orderId } = detail

		await client.hSet(`${PROVIDER_DISTRIBUTION}:${providerName}:REQUESTED`, orderId, timestamp)
	},
	ORDER_UPDATE: async (providerName, detail) => {
		const client = await getRedisClient()
		const keyClient = await getRedisClient({ clusterMode: false })
		const timestamp = Date.now()
		const { orderId, status } = detail
		let statusList = await keyClient.keys(`${PROVIDER_DISTRIBUTION}:${providerName}:*`)
		statusList = (statusList || []).map(q => q.split(':').pop())

		if (statusList.length === 0) {
			statusList = [status]
		}

		if (!statusList.includes(status)) {
			statusList.push(status)
		}

		const promises = statusList.map((s) => {
			if (s === status) {
				return client.hSet(`${PROVIDER_DISTRIBUTION}:${providerName}:${s}`, orderId, timestamp)
			}

			return client.hDel(`${PROVIDER_DISTRIBUTION}:${providerName}:${s}`, orderId)
		})

		await Promise.all(promises)
	},
}

const execute = (providerName) => async (detailType, detail) => {
	if (!mapper[detailType]) {
		logger.warn(`Mapper not found for builder '${providerName}' and detailType '${detailType}'`)

		return
	}

	logger.info(`Executing build '${providerName}' for detailType '${detailType}'`)

	return mapper[detailType](providerName, detail)
}

module.exports = {
	execute,
}
