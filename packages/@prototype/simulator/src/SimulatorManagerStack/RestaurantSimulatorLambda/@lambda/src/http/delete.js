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
		const restaurantStatsId = event.pathParameters ? event.pathParameters.restaurantStatsId : undefined
		const isStats = event.path.includes('/stats')
		const isSimulations = event.path.includes('/simulations')

		if (isSimulations) {
			if (!simulationId) {
				return utils.fail({ error: 'Missing simulationId id, cannot stop the simulation' })
			}

			return commands.stopSimulator(simulationId)
		}

		if (isStats) {
			if (!restaurantStatsId) {
				return utils.fail({ error: 'Missing restaurantStatsId id, cannot delete the restaurants' })
			}

			return commands.deleteRestaurants(restaurantStatsId)
		}

		return utils.fail({ error: 'Error cannot perform the required operation' })
	} catch (err) {
		logger.error('Error while performing delete handle')
		logger.error(err)

		return utils.fail({ error: 'Internal error, please try later' })
	}
}
