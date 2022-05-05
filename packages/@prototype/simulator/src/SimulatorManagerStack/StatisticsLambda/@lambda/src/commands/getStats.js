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
const config = require('../config')
const utils = require('../utils')
const { getRedisClient } = require('/opt/redis-client')
const { REDIS_HASH } = require('/opt/lambda-utils')

const {
	DESTINATION_STATUS,
	ORIGIN_STATUS,
	ORDER_STATUS,
	DRIVER_STATUS_STATISTICS,
	ORDER_TO_PROVIDER,
	PROVIDER_DISTRIBUTION,
	PROVIDER_TIME,
	PROVIDER_ERRORS,
	DISPATCH_ENGINE_STATS,
} = REDIS_HASH

const getStatusCount = async (hashKey) => {
	const client = await getRedisClient()
	const keyClient = await getRedisClient({ clusterMode: false })
	const statusList = await keyClient.keys(`${hashKey}:*`)
	const result = {}

	for (let i = 0; i < statusList.length; i++) {
		const s = statusList[i].split(':').pop()

		result[s.toLocaleLowerCase()] = await client.hLen(`${hashKey}:${s}`)
	}

	return result
}

const getAverageOrderExecutionTime = async (hashKey) => {
	const client = await getRedisClient()
	const orders = await client.hGet(hashKey, 'orders')
	const time = await client.hGet(hashKey, 'duration')

	return (orders && orders !== 0) ? (time / orders) : 0
}

const getCounter = async (hashKey, type) => {
	const client = await getRedisClient()
	const errors = await client.hGet(hashKey, type)

	return errors
}

const getOrdersPerDriverGroup = async (hash) => {
	const client = await getRedisClient()
	const keys = await client.hKeys(hash)
	const result = {}

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]

		result[key] = await client.hGet(hash, key)
	}

	return result
}

const execute = async () => {
	logger.info('Getting statistics')
	const result = {
		origins: {},
		destinations: {},
		orders: {},
		ordersToProvider: {},
		drivers: {},
		providers: {
			[config.webhookProviderName]: {},
			[config.pollingProviderName]: {},
			[config.instantDeliveryProviderName]: {},
			[config.sameDayDeliveryProviderName]: {},
		},
		orderExecutionTime: {
			[config.webhookProviderName]: 0,
			[config.pollingProviderName]: 0,
			[config.instantDeliveryProviderName]: 0,
			[config.sameDayDeliveryProviderName]: 0,
		},
		errors: {
			[config.instantDeliveryProviderName]: 0,
			[config.sameDayDeliveryProviderName]: 0,
		},
		ordersPerDriver: {},
	}

	result.destinations = await getStatusCount(DESTINATION_STATUS)
	result.origins = await getStatusCount(ORIGIN_STATUS)
	result.orders = await getStatusCount(ORDER_STATUS)
	result.drivers = await getStatusCount(DRIVER_STATUS_STATISTICS)
	result.ordersToProvider = await getStatusCount(ORDER_TO_PROVIDER)
	result.providers[config.webhookProviderName] = await getStatusCount(`${PROVIDER_DISTRIBUTION}:${config.webhookProviderName}`)
	result.providers[config.pollingProviderName] = await getStatusCount(`${PROVIDER_DISTRIBUTION}:${config.pollingProviderName}`)
	result.providers[config.instantDeliveryProviderName] = await getStatusCount(`${PROVIDER_DISTRIBUTION}:${config.instantDeliveryProviderName}`)
	result.providers[config.sameDayDeliveryProviderName] = await getStatusCount(`${PROVIDER_DISTRIBUTION}:${config.sameDayDeliveryProviderName}`)
	result.orderExecutionTime[config.webhookProviderName] = await getAverageOrderExecutionTime(`${PROVIDER_TIME}:${config.webhookProviderName}`)
	result.orderExecutionTime[config.pollingProviderName] = await getAverageOrderExecutionTime(`${PROVIDER_TIME}:${config.pollingProviderName}`)
	result.orderExecutionTime[config.instantDeliveryProviderName] = await getAverageOrderExecutionTime(`${PROVIDER_TIME}:${config.instantDeliveryProviderName}`)
	result.orderExecutionTime[config.sameDayDeliveryProviderName] = await getAverageOrderExecutionTime(`${PROVIDER_TIME}:${config.sameDayDeliveryProviderName}`)
	result.errors[config.instantDeliveryProviderName] = await getCounter(`${PROVIDER_ERRORS}:${config.instantDeliveryProviderName}`, 'all')
	result.errors[config.sameDayDeliveryProviderName] = await getCounter(`${PROVIDER_ERRORS}:${config.sameDayDeliveryProviderName}`, 'all')
	result.ordersPerDriver = await getOrdersPerDriverGroup(`${DISPATCH_ENGINE_STATS}:group`)

	logger.log('Returning data:')
	logger.log(result)

	return utils.success({ data: result })
}

module.exports = {
	execute,
}
