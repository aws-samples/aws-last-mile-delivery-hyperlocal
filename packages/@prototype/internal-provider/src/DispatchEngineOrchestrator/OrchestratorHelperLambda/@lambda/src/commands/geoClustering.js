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
const geocluster = require('geocluster')
const logger = require('../utils/logger')
const config = require('../config')

const execute = async (payload) => {
	logger.info('Executing geo clustering for payload')
	logger.info(JSON.stringify(payload))
	const { orders } = payload
	const coordinates = orders.map(q => [q.restaurant.lat, q.restaurant.long])
	const clustered = geocluster(coordinates, config.geoClusteringBias)

	const clonedOrders = JSON.parse(JSON.stringify(orders))
	const clusters = clustered.map(q => {
		const { centroid, elements } = q
		const filteredOrders = elements.map(el => {
			const idx = clonedOrders.findIndex(o => o.restaurant.lat === el[0] && o.restaurant.long === el[1])
			const order = JSON.parse(JSON.stringify(clonedOrders[idx]))

			// remove the order from the list so if there's another order with the same coordinates
			// it won't get assigned wrongly
			clonedOrders.splice(idx, 1)

			return order
		})

		if (filteredOrders.length === 0) {
			return null
		}

		return {
			centroid: {
				lat: centroid[0],
				long: centroid[1],
			},
			orders: filteredOrders,
		}
	}).filter(q => q !== null)

	return {
		clusters,
	}
}

module.exports = {
	execute,
}
