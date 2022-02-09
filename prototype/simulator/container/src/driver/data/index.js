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
let originPath
let restProgress = 0
let destinationPath
let custProgress = 0

const getCoordinates = (lat, long, radius, status) => {
	switch (status) {
		case state.STATUSES.PICKING_UP_GOODS:
		case state.STATUSES.ARRIVED_AT_ORIGIN: {
			const toorigin = state.getState().routing

			if (toorigin.length > 0) {
				if (!originPath) {
					const pathPolyline = toorigin[0].pathPolyline
					originPath = polyline.decode(pathPolyline)

					logger.info('origin path')
					logger.info(originPath)
				}

				const [_lat, _long] = originPath[restProgress]

				if (restProgress === originPath.length - 1) {
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
			const todestination = state.getState().routing

			if (todestination.length > 1) {
				if (!destinationPath) {
					const pathPolyline = todestination[1].pathPolyline
					destinationPath = polyline.decode(pathPolyline)

					logger.info('destination path')
					logger.info(destinationPath)
				}

				const [_lat, _long] = destinationPath[custProgress]

				if (custProgress === destinationPath.length - 1) {
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
			destinationPath = null
			originPath = null
			custProgress = 0
			restProgress = 0

			state.setState('routing', state.DEFAULT_STATE.routing)
			state.setState('destination', state.DEFAULT_STATE.destination)
			state.setState('origin', state.DEFAULT_STATE.origin)

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
