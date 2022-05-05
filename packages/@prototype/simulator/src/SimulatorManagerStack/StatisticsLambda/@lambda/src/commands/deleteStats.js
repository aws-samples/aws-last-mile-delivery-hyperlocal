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

const deleteKeys = async (client, keyClient, hashKey) => {
	const keyList = await keyClient.keys(`${hashKey}:*`)

	await Promise.all(keyList.map(key => client.del(key)))
}

const execute = async () => {
	const client = await getRedisClient()
	const keyClient = await getRedisClient({ clusterMode: false })

	await deleteKeys(client, keyClient, DESTINATION_STATUS)
	await deleteKeys(client, keyClient, ORIGIN_STATUS)
	await deleteKeys(client, keyClient, ORDER_STATUS)
	await deleteKeys(client, keyClient, DRIVER_STATUS_STATISTICS)
	await deleteKeys(client, keyClient, ORDER_TO_PROVIDER)
	await deleteKeys(client, keyClient, `${PROVIDER_DISTRIBUTION}:${config.webhookProviderName}`)
	await deleteKeys(client, keyClient, `${PROVIDER_DISTRIBUTION}:${config.pollingProviderName}`)
	await deleteKeys(client, keyClient, `${PROVIDER_DISTRIBUTION}:${config.instantDeliveryProviderName}`)
	await deleteKeys(client, keyClient, `${PROVIDER_DISTRIBUTION}:${config.sameDayDeliveryProviderName}`)
	await deleteKeys(client, keyClient, `${PROVIDER_TIME}`)
	await deleteKeys(client, keyClient, `${PROVIDER_ERRORS}`)
	await deleteKeys(client, keyClient, `${DISPATCH_ENGINE_STATS}`)

	return utils.success({ })
}

module.exports = {
	execute,
}
