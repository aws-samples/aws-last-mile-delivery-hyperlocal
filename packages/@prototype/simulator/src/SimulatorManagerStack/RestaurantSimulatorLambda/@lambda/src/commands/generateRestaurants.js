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
const step = require('../lib/steps')

const execute = async (body) => {
	const { area, lat, long, radius, batchSize } = body

	if (!area || !lat || !long || !batchSize || !radius) {
		return utils.fail({
			message: 'All the fields are required. Please provide: area, lat, long, batchSize',
		}, 400)
	}

	logger.info('Check if area exists')

	const results = await ddb.scan(config.restaurantStatsTable, { area })
	let statsID = uuidv4()

	if (results.Count > 0) {
		const currentRestaurantStats = results.Items[0]
		statsID = currentRestaurantStats.ID

		logger.info('Updating restaurant stats')

		await ddb.updateItem(config.restaurantStatsTable, statsID, {
			batchSize: batchSize + currentRestaurantStats.batchSize,
		})
	} else {
		logger.info('Creating restaurant stats')

		await ddb.putItem(config.restaurantStatsTable, {
			ID: statsID,
			area,
			lat,
			long,
			radius,
			batchSize,
			state: 'INITIALISED',
		})
	}

	logger.info('Start step function')

	const res = await step.startExecution({
		restaurantStatsId: statsID,
		batchSize,
		lat,
		long,
		radius,
		area,
	}, config.restaurantGeneratorStepFunctions)

	await ddb.updateItem(config.restaurantStatsTable, statsID, {
		stepFunctionExecution: res.executionArn,
	})

	return utils.success({
		id: statsID,
		stepFunctionExecution: res.executionArn,
	})
}

module.exports = {
	execute,
}
