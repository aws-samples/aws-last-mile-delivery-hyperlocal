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
const stopSimulation = require('./stopSimulation').default
const newOrder = require('./newOrder').default
const configUpdate = require('./configUpdate').default
const newAssignment = require('./newAssignment').default
const confirmAssignment = require('./confirmAssignment').default
const rejectAssignment = require('./rejectAssignment').default

const commandHandler = (personalTopic, commonTopic) => {
	return {
		[personalTopic]: {
			NEW_ORDER: newOrder, // instant-delivery
			NEW_ASSIGNMENT: newAssignment, // same-day-delivery
			CONFIRM_ASSIGNMENT: confirmAssignment,
			REJECT_ASSIGNMENT: rejectAssignment,
		},
		[commonTopic]: {
			STOP_SIMULATION: stopSimulation,
			CONFIG_UPDATE: configUpdate,
		},
	}
}

module.exports.default = commandHandler
