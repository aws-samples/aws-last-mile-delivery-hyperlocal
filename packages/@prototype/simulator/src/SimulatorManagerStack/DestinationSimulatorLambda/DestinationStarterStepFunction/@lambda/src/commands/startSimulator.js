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
/* eslint-disable no-console */
const ecs = require('../lib/ecs')
const ddb = require('../lib/dynamoDB')
const config = require('../config')

const runTask = async (executionId, orderRate, orderInterval, rejectionRate, eventsFilePath) => {
	try {
		const res = await ecs.runTask(
			1,
			config,
			executionId,
			orderRate,
			orderInterval,
			rejectionRate,
			eventsFilePath,
		)

		const { failures, tasks } = res

		return {
			failures,
			tasks: tasks.map(q => q.taskArn).flat(),
		}
	} catch (err) {
		console.error('Error starting the task')
		console.error(err)

		return {
			failures: [err.message],
			tasks: [],
		}
	}
}

const execute = async (payload) => {
	const { simulationId, executionId } = payload
	console.log(`Starting ECS Container for the following execution: ${executionId}, for simulation: ${simulationId}`)

	const sim = await ddb.get(config.destinationSimulationTable, simulationId)
	const { Item } = sim

	if (!Item) {
		return {
			error: `Destination Simulation with ID ${simulationId} was not found`,
		}
	}

	const res = await runTask(
		executionId,
		Item.orderRate,
		Item.orderInterval,
		Item.rejectionRate,
		Item.eventsFilePath,
	)
	const { tasks, failures } = res

	let taskArnPrefix = ''

	if (tasks.length > 0) {
		const parts = tasks[0].split('/')
		parts.pop()

		taskArnPrefix = parts.join('/')
	}

	await ddb.updateItem(config.destinationSimulationTable, simulationId, {
		taskArnPrefix,
		tasks: [
			...(Item.tasks || []),
			...tasks.map(q => q.split('/').pop()),
		],
		failures: [
			...(Item.failures || []),
			...failures,
		],
	})

	return { success: true }
}

module.exports = {
	execute,
}
