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
const secretsManager = require('../common/lib/secretsManager')
const Destination = require('./destination')

class DestinationApp {
	constructor (config, options) {
		const params = {
			executionId: config.executionId || options.executionId,
			orderRate: config.orderRate || options.orderRate,
			orderInterval: config.orderInterval || options.orderInterval,
			rejectionRate: config.rejectionRate || options.rejectionRate,
			eventsFilePath: config.eventsFilePath || options.eventsFilePath,
			deliveryType: config.deliveryType || options.deliveryType,
		}
		logger.debug('Starting the Destination App with params: ', JSON.stringify(params))

		this.config = config
		this.params = params
		this.destinations = []
	}

	async init () {
		logger.log(`Retrieving destinations for execution: ${this.params.executionId}`)
		const destinationPassword = await secretsManager.getSecretValue(this.config.destinationPasswordSecret)
		const data = await ddb.query(this.config.destinationTable, this.config.destinationExecutionIdIndex, {
			executionId: this.params.executionId,
		})
		// in case we replay an existing file we need just one destination object to perform the order submission
		const users = this.params.eventsFilePath ? [data.Items[0]] : data.Items
		const destinations = users.map(u => new Destination(this.config, this.params, u, this, destinationPassword))
		logger.log('Initialising destinations')

		for (let i = 0; i < destinations.length; i++) {
			try {
				await destinations[i].init()

				this.destinations.push(destinations[i])
			} catch (err) {
				logger.warn('Error on initialising destination', i, 'it will be skipped')
				logger.error(err)
			}
		}
	}

	async connect () {
		logger.log('Connecting destinations...')

		const connectPromises = this.destinations.map(q => q.connect())

		await Promise.all(connectPromises)
	}

	async terminate () {
		logger.log('Terminating destinations...')

		const disconnectPromises = this.destinations.map(q => q.disconnect())

		await Promise.all(disconnectPromises)
	}
}

module.exports = DestinationApp
