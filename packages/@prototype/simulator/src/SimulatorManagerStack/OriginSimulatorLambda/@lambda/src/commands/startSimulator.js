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
const utils = require('../utils')
const logger = require('../utils/logger')
const ddb = require('../lib/dynamoDB')
const step = require('../lib/steps')
const config = require('../config')

const execute = async (input) => {
	logger.info('Starting the simulation')

	try {
		const { rejectionRate } = input
		const data = await ddb.scan(config.originStatsTable)
		const stats = data.Items
		const simulationId = uuidv4()
		const isRunning = await ddb.scan(config.originSimulationTable, {
			state: 'RUNNING',
		})

		if (isRunning.Count > 0) {
			return utils.fail({
				error: 'Another simulation is still running, please stop it before starting a new one',
			}, 400)
		}

		if (stats.filter(q => q.state !== 'READY').length > 0) {
			return utils.fail({
				error: 'Origins are still generating, wait the operation to complete before starting the simulator',
			}, 400)
		}

		if (stats.length === 0) {
			return utils.fail({
				error: 'There are not origins in the system, please start by generating them',
			}, 400)
		}

		await ddb.putItem(config.originSimulationTable, {
			ID: simulationId,
			stats,
			state: 'STARTING',
			rejectionRate,
			containerBatchSize: Number(config.originContainerBatchSize),
		})

		const res = await step.startExecution({
			simulationId,
			batchSize: Number(config.originContainerBatchSize),
		}, config.originStarterStepFunctions)

		await ddb.updateItem(config.originSimulationTable, simulationId, {
			stepFunctionExecution: res.executionArn,
		})

		return utils.success({
			id: simulationId,
		})
	} catch (err) {
		return utils.fail({
			error: 'Error starting the simulation',
		}, 400)
	}
}

module.exports = {
	execute,
}
