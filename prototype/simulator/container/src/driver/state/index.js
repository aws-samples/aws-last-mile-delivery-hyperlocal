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
const STATUSES = {
	IDLE: 'IDLE',
	ACCEPTED: 'ACCEPTED',
	REJECTED: 'REJECTED',
	CANCELLED: 'CANCELLED',
	PICKING_UP_GOODS: 'PICKING_UP_GOODS',
	ARRIVED_AT_ORIGIN: 'ARRIVED_AT_ORIGIN',
	DELIVERING: 'DELIVERING',
	ARRIVED_AT_DESTINATION: 'ARRIVED_AT_DESTINATION',
	DELIVERED: 'DELIVERED',
}

const state = {
	status: 'IDLE',
	orderId: '',
	routing: [],
	origin: {
		lat: '',
		long: '',
	},
	destination: {
		lat: '',
		long: '',
	},
	updatesConfig: {
		passiveState: {
			captureFrequency: 4,
			sendInterval: 20,
		},
		activeState: {
			captureFrequency: 1,
			sendInterval: 8,
		},
	},
	updates: {
		captureFrequency: 4,
		sendInterval: 20,
	},
}

const stateChangeHandlers = {
	updatesConfig: null,
	updates: null,
}

const randomBetween = (loSec, hiSec) => {
	return Math.floor(loSec * 1000 + (Math.random() * (hiSec - loSec) * 1000))
}

const getState = () => {
	// simple state workflow
	if (state.status === STATUSES.ACCEPTED) {
		setTimeout(() => {
			setState('status', STATUSES.PICKING_UP_GOODS)
			setState('updates', state.updatesConfig.activeState)
		}, randomBetween(7, 11))
	} else if (state.status === STATUSES.ARRIVED_AT_ORIGIN) {
		setTimeout(() => {
			setState('status', STATUSES.DELIVERING)
			setState('updates', state.updatesConfig.activeState)
		}, randomBetween(8, 10))
	} else if (state.status === STATUSES.ARRIVED_AT_DESTINATION) {
		setTimeout(() => {
			setState('status', STATUSES.DELIVERED)
			setState('updates', state.updatesConfig.passiveState)
		}, randomBetween(7, 11))
	} else if (state.status === STATUSES.DELIVERED) {
		setTimeout(() => {
			setState('status', STATUSES.IDLE)
			setState('updates', state.updatesConfig.passiveState)
		}, randomBetween(6, 10))
	}

	return state
}

const getStateRaw = () => {
	return state
}

const setState = (prop, value, sendNotification = true) => {
	const oldValue = state[prop]
	state[prop] = value

	if (sendNotification && stateChangeHandlers[prop] !== undefined) {
		stateChangeHandlers[prop](oldValue, value)
	}
}

const setStateChangeHandler = (prop, fn) => {
	stateChangeHandlers[prop] = fn
}

const generateChangeStatusMessage = (driverId, driverIdentity) => {
	const { status, orderId } = state
	const baseMessage = {
		type: 'STATUS_CHANGE',
		driverId,
		driverIdentity,
		status,
		timestamp: Date.now(),
	}

	if (status !== STATUSES.IDLE) {
		baseMessage.orderId = orderId
	}

	return baseMessage
}

module.exports = {
	getState,
	getStateRaw,
	setState,
	setStateChangeHandler,
	generateChangeStatusMessage,
	STATUSES,
	DEFAULT_STATE: state,
}
