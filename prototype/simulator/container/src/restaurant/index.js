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
const ddb = require('../common/lib/dynamoDB')
const logger = require('../common/utils/logger')
const Restaurant = require('./restaurant')

class RestaurantApp {
	constructor (config, options) {
		const params = {
			executionId: config.executionId || options.executionId,
			rejectionRate: config.rejectionRate || options.rejectionRate,
		}
		logger.debug('Starting the Restaurant app with params: ', JSON.stringify(params))

		this.params = params
		this.config = config
		this.restaurants = []
	}

	async init () {
		logger.log(`Retrieving restaurants for execution: ${this.params.executionId}`)
		const data = await ddb.query(this.config.restaurantTable, this.config.restaurantExecutionIdIndex, {
			executionId: this.params.executionId,
		})
		const users = data.Items
		const restaurants = users.map(u => new Restaurant(this.config, this.params, u, this))
		logger.log('Initialising restaurants')

		for (let i = 0; i < restaurants.length; i++) {
			try {
				await restaurants[i].init()

				this.restaurants.push(restaurants[i])
			} catch (err) {
				logger.warn('Error initialising the restuarant, skipping')
				logger.warn(err)
			}
		}
	}

	async connect () {
		logger.log('Connecting restaurants...')

		const connectPromises = this.restaurants.map(q => q.connect())

		await Promise.all(connectPromises)
	}

	async terminate () {
		logger.log('Terminating restaurants...')

		const disconnectPromises = this.restaurants.map(q => q.disconnect())

		await Promise.all(disconnectPromises)
	}
}

module.exports = RestaurantApp
