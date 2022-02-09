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
const ddb = require('../lib/dynamoDB')
const config = require('../config')

const execute = async (payload) => {
	const { simulationId } = payload
	console.log('Updating simulation state for id: ', simulationId)

	const simulation = await ddb.get(config.restaurantSimulationTable, simulationId)
	const { Item } = simulation

	if (!Item) {
		console.error(`Simulation with id ${simulationId} was not found`)

		return { error: `Simulation with id ${simulationId} was not found` }
	}

	let state = 'RUNNING'

	if (Item.tasks.length > 0 && Item.failures.length > 0) {
		state = 'RUNNING_WITH_ERROR'
	}

	if (Item.tasks.length === 0 && Item.failures.length > 0) {
		state = 'ERROR'
	}

	await ddb.updateItem(config.restaurantSimulationTable, simulationId, {
		state,
	})

	return { success: true }
}

module.exports = {
	execute,
}
