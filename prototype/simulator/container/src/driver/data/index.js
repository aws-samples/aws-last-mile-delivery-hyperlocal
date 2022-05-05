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
let currentSegment
let currentProgress
let currentPath

const getIdlePosition = (lat, long, radius) => {
	if (!startingPosition) {
		logger.info('Generating starting point...')
		startingPosition = helper.generateRandomPoint(lat, long, radius)

		return [startingPosition.latitude, startingPosition.longitude, startingPosition.elevation]
	}

	const { latitude, longitude } = startingPosition
	// after the first initialization move the driver around the starting position
	// within 100 meters to simulate motion
	currentPosition = helper.generateRandomPoint(latitude, longitude, 100)

	return [currentPosition.latitude, currentPosition.longitude, currentPosition.elevation]
}

const getSegmentLocations = async (lat, long, radius, _status, segments) => {
	if (currentSegment >= segments.length) {
		logger.info('Played all segments for assigment.')

		state.setState('assignmentStatus', state.ASSIGNMENT_STATUS.IDLE)
		state.setState('status', state.STATUSES.IDLE)

		return getIdlePosition(lat, long, radius)
	}

	const { orderId, from, to, segmentType, route } = segments[currentSegment]

	state.setState('orderId', orderId)

	if (!currentPath) {
		currentPath = polyline.decode(route.pointsEncoded)

		logger.info('Following path for order: ', orderId, ' on: ', JSON.stringify(currentPath))
	}
	const [_lat, _long] = currentPath[currentProgress] || currentPath[currentProgress - 1] || [lat, long]

	const currentState = state.getState()
	const status = currentState.orderIdsList[currentState.orderId]

	if (currentProgress < currentPath.length) {
		logger.debug(`Order [${currentState.orderId}]: ${status}`)

		// simple state workflow
		if (currentState.orderIdsList[currentState.orderId] === state.STATUSES.ACCEPTED) {
			state.setState('orderIdsList', {
				...currentState.orderIdsList,
				[currentState.orderId]: state.STATUSES.PICKING_UP_GOODS,
			})
			state.setState('updates', currentState.updatesConfig.activeState)
		} else if (currentState.orderIdsList[currentState.orderId] === state.STATUSES.ARRIVED_AT_ORIGIN) {
			state.setState('orderIdsList', {
				...currentState.orderIdsList,
				[currentState.orderId]: state.STATUSES.DELIVERING,
			})
			state.setState('updates', currentState.updatesConfig.activeState)
		}

		if ([state.STATUSES.DELIVERING, state.STATUSES.PICKING_UP_GOODS].includes(status)) {
			currentProgress++
		}
	} else {
		logger.debug('============ switching segement =============')

		if (segmentType === 'TO_ORIGIN' && status === state.STATUSES.PICKING_UP_GOODS) {
			logger.info('Arrived at origin. Order: ', orderId)

			state.setState('orderIdsList', {
				...currentState.orderIdsList,
				[currentState.orderId]: state.STATUSES.ARRIVED_AT_ORIGIN,
			})
		}

		if (segmentType === 'TO_DESTINATION' && status === state.STATUSES.DELIVERING) {
			logger.info('Arrived at destination. Order: ', orderId)

			// ARRIVED_AT_DESTINATION is a status that might make sense only in real-life scenario
			// for this simulation if the order has been finalised we'd just set it to delivered
			// state.setState('orderIdsList', {
			// 	...currentState.orderIdsList,
			// 	[currentState.orderId]: state.STATUSES.ARRIVED_AT_DESTINATION,
			// })

			state.setState('orderIdsList', {
				...currentState.orderIdsList,
				[currentState.orderId]: state.STATUSES.DELIVERED,
			})
		}

		if (currentPath) {
			currentPath = null
			currentProgress = 0
			currentSegment++
		}
	}

	return [_lat, _long, 0]
}

const getCoordinates = (lat, long, radius, status) => {
	if (state.getState().assignmentStatus === state.ASSIGNMENT_STATUS.IDLE) {
		currentPath = null
		currentProgress = 0
		currentSegment = 0

		state.setState('segments', [])
		state.setState('jobId', undefined)
		state.setState('orderId', undefined)
		state.setState('orderIdsList', [])
		state.setState('updates', state.DEFAULT_STATE.updatesConfig.passiveState)

		return getIdlePosition(lat, long, radius)
	}

	if (state.getState().assignmentStatus === state.ASSIGNMENT_STATUS.TO_CONFIRM) {
		// waiting for backend confirmation in case of same-day-delivery
		return getIdlePosition(lat, long, radius)
	}

	// get the segment location only if the status of the assignmnet is IN_PROGRESS
	return getSegmentLocations(lat, long, radius, status, state.getState().segments)
}

/// range not used anymore at this point, due to wrong random point generation
const generatePoint = async (lat, long, range) => {
	const [latitude, longitude, elevation] = await getCoordinates(lat, long, range, state.getState().status)

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
