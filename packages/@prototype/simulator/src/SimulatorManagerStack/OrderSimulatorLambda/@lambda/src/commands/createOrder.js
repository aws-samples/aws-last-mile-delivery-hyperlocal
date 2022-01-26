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
const { v4: uuidv4 } = require('uuid')
const logger = require('../utils/logger')
const utils = require('../utils')
const config = require('../config')
const ddb = require('../lib/dynamoDB')
const events = require('../lib/eventBridge')

const execute = async (body) => {
	const { customer, restaurant, quantity } = body

	logger.info('Creating order with configuration: ')
	logger.info(JSON.stringify(body, null, 2))

	if (!customer || !restaurant) {
		return utils.fail({
			message: 'Both customer and restaurant information are required.',
		}, 400)
	}

	if (!customer.id || !customer.lat || !customer.long) {
		return utils.fail({
			message: 'Lat and Long are required for the customer',
		}, 400)
	}

	if (!restaurant.id || !restaurant.lat || !restaurant.long) {
		return utils.fail({
			message: 'Lat and Long are required for the restaurant',
		}, 400)
	}

	const orders = []
	const rnd = 10 + (Math.floor(Math.random() * 20) + 1)
	const add = 5 + (Math.floor(Math.random() * 5) + 1)
	const op = Math.random() < 0.5 ? -1 : 1
	const variance = Math.floor(Math.random() * 100)

	for (let i = 0; i < (Number(quantity) || 1); i++) {
		const id = uuidv4()
		const record = {
			ID: id,
			customer,
			restaurant: {
				...restaurant,
				// add a preparation time between 10 and 30 minutes
				// in 3% of the cases, add/remove another random 5 to 10 minutes
				preparationTimeInMins: rnd + (variance <= 3 ? (op * add) : 0),
			},
			state: 'NEW_ORDER',
			createdAt: Date.now(),
		}

		await ddb.putItem(config.orderTableName, record)
		await events.putEvent('NEW_ORDER', record)
		orders.push(id)
	}

	if (orders.length > 1) {
		return utils.success({
			orders,
		})
	}

	return utils.success({
		orderId: orders[0],
	})
}

module.exports = {
	execute,
}
