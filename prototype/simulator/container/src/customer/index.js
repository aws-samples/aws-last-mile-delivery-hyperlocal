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
const logger = require('../common/utils/logger')
const ddb = require('../common/lib/dynamoDB')
const Customer = require('./customer')

class CustomerApp {
	constructor (config, options) {
		const params = {
			executionId: config.executionId || options.executionId,
			orderRate: config.orderRate || options.orderRate,
			orderInterval: config.orderInterval || options.orderInterval,
			rejectionRate: config.rejectionRate || options.rejectionRate,
		}
		logger.debug('Starting the Customer App with params: ', JSON.stringify(params))

		this.config = config
		this.params = params
		this.customers = []
	}

	async init () {
		logger.log(`Retrieving customers for execution: ${this.params.executionId}`)
		const data = await ddb.query(this.config.customerTable, this.config.customerExecutionIdIndex, {
			executionId: this.params.executionId,
		})
		const users = data.Items
		const customers = users.map(u => new Customer(this.config, this.params, u, this))
		logger.log('Initialising customers')

		for (let i = 0; i < customers.length; i++) {
			try {
				await customers[i].init()

				this.customers.push(customers[i])
			} catch (err) {
				logger.warn('Error on initialising customer', i, 'it will be skipped')
				logger.error(err)
			}
		}
	}

	async connect () {
		logger.log('Connecting customers...')

		const connectPromises = this.customers.map(q => q.connect())

		await Promise.all(connectPromises)
	}

	async terminate () {
		logger.log('Terminating customers...')

		const disconnectPromises = this.customers.map(q => q.disconnect())

		await Promise.all(disconnectPromises)
	}
}

module.exports = CustomerApp
