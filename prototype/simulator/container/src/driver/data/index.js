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
const polyline = require('@mapbox/polyline')
const state = require('../state')
const logger = require('../../common/utils/logger')
const helper = require('../../common/helper')

let startingPosition
let currentPosition
let restaurantPath
let restProgress = 0
let customerPath
let custProgress = 0

const getCoordinates = (lat, long, radius, status) => {
	switch (status) {
		case state.STATUSES.PICKING_UP_GOODS:
		case state.STATUSES.ARRIVED_AT_ORIGIN: {
			const toRestaurant = state.getState().routing

			if (toRestaurant.length > 0) {
				if (!restaurantPath) {
					const pathPolyline = toRestaurant[0].pathPolyline
					restaurantPath = polyline.decode(pathPolyline)

					logger.info('Restaurant path')
					logger.info(restaurantPath)
				}

				const [_lat, _long] = restaurantPath[restProgress]

				if (restProgress === restaurantPath.length - 1) {
					if (status === state.STATUSES.PICKING_UP_GOODS) {
						state.setState('status', state.STATUSES.ARRIVED_AT_ORIGIN)
					}
				} else {
					restProgress++
				}

				return [_lat, _long, 0]
			}

			return [lat, long, 0]
		}
		case state.STATUSES.DELIVERING:
		case state.STATUSES.ARRIVED_AT_DESTINATION:
		case state.STATUSES.DELIVERED: {
			const toCustomer = state.getState().routing

			if (toCustomer.length > 1) {
				if (!customerPath) {
					const pathPolyline = toCustomer[1].pathPolyline
					customerPath = polyline.decode(pathPolyline)

					logger.info('Customer path')
					logger.info(customerPath)
				}

				const [_lat, _long] = customerPath[custProgress]

				if (custProgress === customerPath.length - 1) {
					if (status === state.STATUSES.DELIVERING) {
						state.setState('status', state.STATUSES.ARRIVED_AT_DESTINATION)
					}
				} else {
					custProgress++
				}

				return [_lat, _long, 0]
			}

			return [lat, long, 0]
		}
		case state.STATUSES.IDLE:
		case state.STATUSES.ACCEPTED:
		default: {
			customerPath = null
			restaurantPath = null
			custProgress = 0
			restProgress = 0

			state.setState('routing', state.DEFAULT_STATE.routing)
			state.setState('customer', state.DEFAULT_STATE.customer)
			state.setState('restaurant', state.DEFAULT_STATE.restaurant)

			if (!startingPosition) {
				startingPosition = helper.generateRandomPoint(lat, long, radius)

				return [startingPosition.latitude, startingPosition.longitude, startingPosition.elevation]
			}

			const { latitude, longitude } = startingPosition
			// after the first initialization move the driver around the starting position
			// within 100 meters to simulate motion
			currentPosition = helper.generateRandomPoint(latitude, longitude, 100)

			return [currentPosition.latitude, currentPosition.longitude, currentPosition.elevation]
		}
	}
}

/// range not used anymore at this point, due to wrong random point generation
const generatePoint = (lat, long, range) => {
	const [latitude, longitude, elevation] = getCoordinates(lat, long, range, state.getState().status)

	return {
		type: 'LOCATION_UPDATE',
		locations: [
			{
				timestamp: Date.now(),
				latitude,
				longitude,
				elevation,
			},
		],
		status: state.getState().status,
	}
}

module.exports = {
	generatePoint,
	getCoordinates,
}
