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

const getSegmentLocations = (lat, long, radius, status, segments) => {
	if (currentSegment >= segments.length) {
		logger.info('Played all segments for assigment.')
		state.setState('assignmentStatus', state.ASSIGNMENT_STATUS.IDLE)

		return getIdlePosition(lat, long, radius)
	}

	const { orderId, from, to, segmentType, route } = segments[currentSegment]

	state.setState('orderId', orderId)

	if (!currentPath) {
		currentPath = polyline.decode(route.pointsEncoded)

		logger.info('Following path on: ', JSON.stringify(currentPath))
	}
	const [_lat, _long] = currentPath[currentProgress]

	if (currentProgress < currentPath.length - 1) {
		currentProgress++

		return [_lat, _long, 0]
	} else {
		if (segmentType === 'TO_ORIGIN' && status === state.STATUSES.PICKING_UP_GOODS) {
			logger.info('Arrived at origin. Order: ', orderId)

			state.setState('status', state.STATUSES.ARRIVED_AT_ORIGIN)
		}

		if (segmentType === 'TO_DESTINATION' && status === state.STATUSES.DELIVERING) {
			logger.info('Arrived at destination. Order: ', orderId)

			state.setState('status', state.STATUSES.ARRIVED_AT_DESTINATION)
		}

		currentPath = null
		currentProgress = 0
		currentSegment++

		return getSegmentLocations(lat, long, radius, status, segments)
	}
}

const getCoordinates = (lat, long, radius, status) => {
	if (state.getState().assignmentStatus === state.ASSIGNMENT_STATUS.IDLE) {
		currentPath = null
		currentProgress = 0
		currentSegment = 0

		state.setState('segments', state.DEFAULT_STATE.segments)
		state.setState('jobId', state.DEFAULT_STATE.jobId)
		state.setState('orderId', state.DEFAULT_STATE.orderId)

		return getIdlePosition(lat, long, radius)
	}

	return getSegmentLocations(lat, long, radius, status, state.getState().segments)
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
