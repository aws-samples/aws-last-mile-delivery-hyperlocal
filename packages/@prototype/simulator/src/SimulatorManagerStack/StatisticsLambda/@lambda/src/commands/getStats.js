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
const utils = require('../utils')
const { getRedisClient } = require('/opt/redis-client')
const { REDIS_HASH } = require('/opt/lambda-utils')

const {
	CUSTOMER_STATUS,
	RESTAURANT_STATUS,
	ORDER_STATUS,
	DRIVER_STATUS_STATISTICS,
	ORDER_TO_PROVIDER,
	PROVIDER_DISTRIBUTION,
	PROVIDER_TIME,
	PROVIDER_ERRORS,
	DISPATCH_ENGINE_STATS,
} = REDIS_HASH

const client = getRedisClient()

client.hget = promisify(client.hget)
client.hlen = promisify(client.hlen)
client.keys = promisify(client.keys)
client.hkeys = promisify(client.hkeys)

const getStatusCount = async (hashKey) => {
	const statusList = await client.keys(`${hashKey}:*`)
	const result = {}

	for (let i = 0; i < statusList.length; i++) {
		const s = statusList[i].split(':').pop()

		result[s.toLocaleLowerCase()] = await client.hlen(`${hashKey}:${s}`)
	}

	return result
}

const getAverageOrderExecutionTime = async (hashKey) => {
	const orders = await client.hget(hashKey, 'orders')
	const time = await client.hget(hashKey, 'duration')

	return (orders && orders !== 0) ? (time / orders) : 0
}

const getCounter = async (hashKey, type) => {
	const errors = await client.hget(hashKey, type)

	return errors
}

const getOrdersPerDriverGroup = async (hash) => {
	const keys = await client.hkeys(hash)
	const result = {}

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]

		result[key] = await client.hget(hash, key)
	}

	return result
}

const execute = async () => {
	logger.info('Getting statistics')
	const result = {
		restaurants: {},
		customers: {},
		orders: {},
		ordersToProvider: {},
		drivers: {},
		providers: {
			[config.webhookProviderName]: {},
			[config.pollingProviderName]: {},
			[config.internalProviderName]: {},
		},
		orderExecutionTime: {
			[config.webhookProviderName]: 0,
			[config.pollingProviderName]: 0,
			[config.internalProviderName]: 0,
		},
		errors: {
			[config.internalProviderName]: 0,
		},
		ordersPerDriver: {},
	}

	result.customers = await getStatusCount(CUSTOMER_STATUS)
	result.restaurants = await getStatusCount(RESTAURANT_STATUS)
	result.orders = await getStatusCount(ORDER_STATUS)
	result.drivers = await getStatusCount(DRIVER_STATUS_STATISTICS)
	result.ordersToProvider = await getStatusCount(ORDER_TO_PROVIDER)
	result.providers[config.webhookProviderName] = await getStatusCount(`${PROVIDER_DISTRIBUTION}:${config.webhookProviderName}`)
	result.providers[config.pollingProviderName] = await getStatusCount(`${PROVIDER_DISTRIBUTION}:${config.pollingProviderName}`)
	result.providers[config.internalProviderName] = await getStatusCount(`${PROVIDER_DISTRIBUTION}:${config.internalProviderName}`)
	result.orderExecutionTime[config.webhookProviderName] = await getAverageOrderExecutionTime(`${PROVIDER_TIME}:${config.webhookProviderName}`)
	result.orderExecutionTime[config.pollingProviderName] = await getAverageOrderExecutionTime(`${PROVIDER_TIME}:${config.pollingProviderName}`)
	result.orderExecutionTime[config.internalProviderName] = await getAverageOrderExecutionTime(`${PROVIDER_TIME}:${config.internalProviderName}`)
	result.errors[config.internalProviderName] = await getCounter(`${PROVIDER_ERRORS}:${config.internalProviderName}`, 'all')
	result.ordersPerDriver = await getOrdersPerDriverGroup(`${DISPATCH_ENGINE_STATS}:group`)

	logger.log('Returning data:')
	logger.log(result)

	return utils.success({ data: result })
}

module.exports = {
	execute,
}
