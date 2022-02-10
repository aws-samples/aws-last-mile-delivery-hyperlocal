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
const ddb = require('../lib/dynamoDB')

const execute = async (payload) => {
	logger.info('Locking driver for payload')
	logger.info(JSON.stringify(payload))
	const { driverId, driverIdentity, orders } = payload
	const res = await ddb.get(config.providerLocksTable, driverId)

	if (!orders || orders.length === 0) {
		return { locked: false, reason: 'no orders' }
	}

	if (res.Item && !res.Item.locked) {
		try {
			await ddb.updateItem(config.providerLocksTable, driverId, {
				locked: true,
				orders: orders.map(q => q.orderId),
			}, {
				locked: false,
			})

			return { locked: true }
		} catch (err) {
			logger.warn('Failed to lock the driver (update with condition expression)')
			logger.warn(err)
		}
	}

	if (!res.Item) {
		try {
			await ddb.putItem(config.providerLocksTable, {
				ID: driverId,
				locked: true,
				driverIdentity,
				orders: orders.map(q => q.orderId),
			})

			return { locked: true }
		} catch (err) {
			logger.warn('Failed to lock the driver (write new item)')
			logger.warn(err)
		}
	}

	return { locked: false, reason: 'driver already locked' }
}

module.exports = {
	execute,
}
