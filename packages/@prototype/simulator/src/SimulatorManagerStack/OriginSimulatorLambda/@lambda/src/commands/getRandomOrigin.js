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
const utils = require('../utils')
const logger = require('../utils/logger')
const { getRedisClient } = require('/opt/redis-client')
const { REDIS_HASH, hashCode } = require('/opt/lambda-utils')
const ddb = require('../lib/dynamoDB')
const config = require('../config')

const { ORIGIN_BY_AREA, ORIGIN_STATUS } = REDIS_HASH

const execute = async (area) => {
	const client = await getRedisClient()
	logger.info('Getting a random origin by area: ', area)

	if (!area) {
		return utils.fail({ message: 'Missing required parameter, area' }, 400)
	}

	const areaCode = hashCode(area)
	const randomId = await client.sRandMember(`${ORIGIN_BY_AREA}:${areaCode}`)

	logger.info('Random origin Id retrieved from redis: ', randomId)

	if (!randomId) {
		logger.warn('Cannot find the origin, ID from Redis:', randomId)

		return utils.fail({ message: 'Error fiding a origin' }, 404)
	}

	logger.info('Verifying if the origin is online')

	const origin = await client.hGet(`${ORIGIN_STATUS}:ONLINE`, randomId)

	if (!origin) {
		logger.warn('Origin is offline, returning 400')

		return utils.fail({ message: 'Origin is offline, try to launch the simulator' }, 400)
	}

	const res = await ddb.get(config.originTable, randomId)

	if (!res.Item) {
		logger.warn('Cannot find the origin in DynamoDB')

		return utils.fail({ message: `Cannot find origin with ID: ${randomId}` }, 404)
	}

	logger.info('Returning the origin data')

	return utils.success({
		data: res.Item,
	})
}

module.exports = {
	execute,
}
