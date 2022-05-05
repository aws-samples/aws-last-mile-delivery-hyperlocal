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
const logger = require('../../common/utils/logger')
const state = require('../state')

// this is for instant delivery
const execute = async (payload) => {
	logger.info('Executing command: newOrder')
	logger.info('Payload', JSON.stringify(payload))

	const { jobId, segments } = payload
	const currentState = state.getStateRaw()
	const current = currentState.assignmentStatus

	if (current === state.ASSIGNMENT_STATUS.IDLE) {
		const sortedSegments = segments.sort((a, b) => a.index - b.index)
		const orderIdsList = sortedSegments.reduce((inc, curr) => ({ ...inc, [curr.orderId]: state.STATUSES.ACCEPTED }), {})

		state.setState('segments', sortedSegments)
		state.setState('jobId', jobId)
		state.setState('orderId', undefined)
		state.setState('orderIdsList', orderIdsList)
		state.setState('status', state.STATUSES.ACCEPTED)
		state.setState('assignmentStatus', state.ASSIGNMENT_STATUS.IN_PROGRESS)
		state.setState('updates', currentState.updatesConfig.activeState)
	} else {
		state.setState('status', state.STATUSES.REJECTED)
		state.setState('updates', currentState.updatesConfig.passiveState)
		state.setState('assignmentStatus', state.ASSIGNMENT_STATUS.IDLE)
	}
}

module.exports.default = execute
