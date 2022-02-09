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

	const results = await ddb.scan(config.destinationStatsTable, { area })
	let statsID = uuidv4()

	if (results.Count > 0) {
		const currentDestinationStats = results.Items[0]
		statsID = currentDestinationStats.ID

		logger.info('Updating destination stats')

		await ddb.updateItem(config.destinationStatsTable, statsID, {
			batchSize: batchSize + currentDestinationStats.batchSize,
		})
	} else {
		logger.info('Creating destination stats')

		await ddb.putItem(config.destinationStatsTable, {
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
		destinationStatsId: statsID,
		batchSize,
		lat,
		long,
		radius,
		area,
	}, config.destinationGeneratorStepFunctions)

	await ddb.updateItem(config.destinationStatsTable, statsID, {
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
