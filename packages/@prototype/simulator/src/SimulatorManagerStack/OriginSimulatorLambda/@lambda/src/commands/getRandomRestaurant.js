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
const utils = require('../utils')
const logger = require('../utils/logger')
const { getRedisClient } = require('/opt/redis-client')
const { REDIS_HASH, hashCode } = require('/opt/lambda-utils')
const ddb = require('../lib/dynamoDB')
const config = require('../config')

const { RESTAURANT_BY_AREA, RESTAURANT_STATUS } = REDIS_HASH
const client = getRedisClient()

client.srandmember = promisify(client.srandmember)
client.hget = promisify(client.hget)

const execute = async (area) => {
	logger.info('Getting a random restaurant by area: ', area)

	if (!area) {
		return utils.fail({ message: 'Missing required parameter, area' }, 400)
	}

	const areaCode = hashCode(area)
	const randomId = await client.srandmember(`${RESTAURANT_BY_AREA}:${areaCode}`)

	logger.info('Random Restaurant Id retrieved from redis: ', randomId)

	if (!randomId) {
		logger.warn('Cannot find the restaurant, ID from Redis:', randomId)

		return utils.fail({ message: 'Error fiding a restaurant' }, 404)
	}

	logger.info('Verifying if the restaurant is online')

	const restaurant = await client.hget(`${RESTAURANT_STATUS}:ONLINE`, randomId)

	if (!restaurant) {
		logger.warn('Restaurant is offline, returning 400')

		return utils.fail({ message: 'Restaurant is offline, try to launch the simulator' }, 400)
	}

	const res = await ddb.get(config.restaurantTable, randomId)

	if (!res.Item) {
		logger.warn('Cannot find the restaurant in DynamoDB')

		return utils.fail({ message: `Cannot find restaurant with ID: ${randomId}` }, 404)
	}

	logger.info('Returning the restaurant data')

	return utils.success({
		data: res.Item,
	})
}

module.exports = {
	execute,
}
