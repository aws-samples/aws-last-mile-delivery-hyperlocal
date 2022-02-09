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
const utils = require('../utils')
const logger = require('../utils/logger')
const commands = require('../commands')

module.exports.default = (event) => {
	try {
		const simulationId = event.pathParameters ? event.pathParameters.simulationId : undefined
		const destinationStatsId = event.pathParameters ? event.pathParameters.destinationStatsId : undefined
		const isStats = event.path.includes('/stats')
		const isSimulations = event.path.includes('/simulations')

		if (simulationId) {
			return commands.getSimulation(simulationId)
		}

		if (destinationStatsId) {
			return commands.getDestinationStat(destinationStatsId)
		}

		if (isSimulations) {
			return commands.getSimulations()
		}

		if (isStats) {
			return commands.getDestinationsStats()
		}

		return utils.fail({ error: 'Request cannot be served' })
	} catch (err) {
		logger.error('Error while retrieving destinations information')
		logger.error(err)

		return utils.fail({ error: 'Error while retrieving destinations information' })
	}
}
