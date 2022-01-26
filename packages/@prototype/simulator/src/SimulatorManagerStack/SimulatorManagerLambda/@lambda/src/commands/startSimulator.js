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
const step = require('../lib/steps')
const ddb = require('../lib/dynamoDB')

const singleArea = (simulationId, area, procNum) => {
	if (!area.lat || !area.long || !area.range || !area.drivers) {
		throw new Error('Missing required field in the given area, will be skipped')
	}
	logger.debug('Starting area with the following:')
	logger.debug(JSON.stringify(area))

	const tenth = Math.floor(area.drivers / 10)
	const rest = area.drivers % 10
	const tasks = Array(tenth).fill(10)

	if (rest > 0) {
		tasks.push(rest)
	}

	const result = tasks.map((size) => ({
		size,
		procNum,
		area,
	}))

	logger.info('Mapped area')
	logger.info(result)

	// ----------------------------------------
	// commented as it will not be able to run
	// for a large number of input, due to
	// API throttling.
	//
	// This method generate the params and starts
	// a step function which will invoke the
	// ECS Run Task with a timeout in between calls
	// ----------------------------------------
	// return ecs.runTask(
	// 	size,
	// 	config.clusterName,
	// 	config.taskDefinitionName,
	// 	config.containerName,
	// 	config.subnets,
	// 	[config.securityGroup],
	// 	procNum,
	// 	area,
	// 	['--lat', area.lat.toString(), '--long', area.long.toString(), '--range', area.range.toString()],
	// )

	return result
}

const execute = async (body) => {
	const { name, areas, procNum = 1 } = body

	logger.info('Starting simulator with configuration: ')
	logger.info(JSON.stringify(body, null, 2))

	if (!areas || areas.length === 0) {
		return utils.fail({
			message: 'The areas array must be present and contain at least one element.',
		}, 400)
	}

	const id = uuidv4()
	await ddb.putItem(config.simulatorTableName, {
		ID: id,
		name,
		areas,
		procNum,
		state: 'STARTING',
	})

	const stepFunctionInput = areas.map(a => singleArea(id, a, procNum)).flat()
	const res = await step.startExecution({
		simulationId: id,
		tasks: stepFunctionInput,
	})

	await ddb.updateItem(config.simulatorTableName, id, {
		stepFunctionExecution: res.executionArn,
	})

	return utils.success({
		id,
		stepFunctionExecution: res.executionArn,
	})
}

module.exports = {
	execute,
}
