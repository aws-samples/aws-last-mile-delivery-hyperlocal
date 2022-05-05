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

const execute = async (payload) => {
	logger.info('Executing command: rejectAssignment')
	logger.info('Payload', JSON.stringify(payload))

	const { jobId } = payload
	const currentState = state.getStateRaw()
	const current = currentState.assignmentStatus

	if (current === state.ASSIGNMENT_STATUS.TO_CONFIRM && currentState.jobId === jobId) {
		logger.debug('Assignment rejected from the backend')

		state.setState('segments', [])
		state.setState('jobId', undefined)
		state.setState('orderId', undefined)
		state.setState('updates', currentState.updatesConfig.passiveState)
		state.setState('status', state.STATUSES.IDLE)
		state.setState('assignmentStatus', state.ASSIGNMENT_STATUS.IDLE)
	}
}

module.exports.default = execute
