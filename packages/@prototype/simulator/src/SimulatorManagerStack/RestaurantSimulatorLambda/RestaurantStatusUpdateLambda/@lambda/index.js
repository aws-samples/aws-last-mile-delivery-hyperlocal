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
/* eslint-disable no-console */
const aws = require('aws-sdk')
const { promisify } = require('util')
const { getRedisClient } = require('/opt/redis-client')
const { REDIS_HASH, hashCode } = require('/opt/lambda-utils')

const { RESTAURANT_BY_AREA, RESTAURANT_STATUS } = REDIS_HASH

const client = getRedisClient()
const eventBridge = new aws.EventBridge()

client.keys = promisify(client.keys)
client.sadd = promisify(client.sadd)
client.hset = promisify(client.hset)
client.hdel = promisify(client.hdel)

const handler = async (event, context) => {
	console.debug(`Event payload: ${JSON.stringify(event, null, 2)}`) // TODO: remove this for PROD

	try {
		await eventBridge.putEvents({
			Entries: [{
				EventBusName: process.env.EVENT_BUS_NAME,
				Source: process.env.SERVICE_NAME,
				DetailType: `RESTAURANT_${event.type}`,
				Detail: JSON.stringify(event),
			}],
		}).promise()

		console.debug(`STATUS_CHANGE :: ${event.restaurantId} :: Successfully sent to Event Bridge`)
	} catch (err) {
		console.error(`Error sending message to Event Bridge :: ${event.type} :: ${JSON.stringify(err)}`)
	}

	if (event.type !== 'STATUS_CHANGE') {
		console.error(`Record from IoT Core is not valid. The type is not 'STATUS_CHANGE', skipping. Data received: ${JSON.stringify(event)}`)

		return
	}

	if (!recordValid(event)) {
		console.error(`Record from IoT Core is not valid. Skipping. Data received: ${JSON.stringify(event)}`)

		return
	}

	const { restaurantId, status, area, timestamp } = event
	const areaCode = hashCode(area)

	try {
		let statusList = await client.keys(`${RESTAURANT_STATUS}:*`)
		statusList = (statusList || []).map(q => q.split(':').pop())

		if (statusList.length === 0) {
			statusList = [status]
		}

		if (!statusList.includes(status)) {
			statusList.push(status)
		}

		// update id by area in REDIS
		await client.sadd(`${RESTAURANT_BY_AREA}:${areaCode}`, restaurantId)

		// update id by area in REDIS
		const promises = statusList.map(s => {
			if (s === status) {
				return client.hset(`${RESTAURANT_STATUS}:${s}`, restaurantId, timestamp)
			}

			return client.hdel(`${RESTAURANT_STATUS}:${s}`, restaurantId)
		})

		await Promise.all(promises)

		console.debug(`STATUS_CHANGE :: ${restaurantId} :: Successfully updated Redis`)
	} catch (err) {
		console.error(`Error updating Redis :: ${event.type} :: ${JSON.stringify(err)}`)
		console.error(err)
	}
}

const recordValid = (record) => {
	return !(record.restaurantId == null || record.status == null || record.timestamp == null)
}
exports.handler = handler
