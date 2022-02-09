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
const Origin = require('./origin')

class OriginApp {
	constructor (config, options) {
		const params = {
			executionId: config.executionId || options.executionId,
			rejectionRate: config.rejectionRate || options.rejectionRate,
		}
		logger.debug('Starting the Origin app with params: ', JSON.stringify(params))

		this.params = params
		this.config = config
		this.origins = []
	}

	async init () {
		logger.log(`Retrieving origins for execution: ${this.params.executionId}`)
		const data = await ddb.query(this.config.originTable, this.config.originExecutionIdIndex, {
			executionId: this.params.executionId,
		})
		const users = data.Items
		const origins = users.map(u => new Origin(this.config, this.params, u, this))
		logger.log('Initialising origins')

		for (let i = 0; i < origins.length; i++) {
			try {
				await origins[i].init()

				this.origins.push(origins[i])
			} catch (err) {
				logger.warn('Error initialising the restuarant, skipping')
				logger.warn(err)
			}
		}
	}

	async connect () {
		logger.log('Connecting origins...')

		const connectPromises = this.origins.map(q => q.connect())

		await Promise.all(connectPromises)
	}

	async terminate () {
		logger.log('Terminating origins...')

		const disconnectPromises = this.origins.map(q => q.disconnect())

		await Promise.all(disconnectPromises)
	}
}

module.exports = OriginApp
