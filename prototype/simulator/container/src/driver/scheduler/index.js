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
const messageGenerator = require('../data')
const state = require('../state')
const helper = require('../../common/helper')
const logger = require('../../common/utils/logger')

class Scheduler {
	constructor (config, { device, driverId, driverIdentity }) {
		this.config = config
		this.device = device
		this.driverId = driverId
		this.driverIdentity = driverIdentity

		this.sendIntervalId = -1
		this.sendStatusIntervalId = -1
		this.locationUpdateIntervalId = -1

		this.currentStatus = null
		this.currentOrderStatus = {}
		this.locations = []

		// register state changed handlers
		state.setStateChangeHandler('updatesConfig', this.updatesConfigChanged.bind(this))
		state.setStateChangeHandler('updates', this.updatesChanged.bind(this))
	}

	trySendStatusUpdateMessage = () => {
		const currentState = state.getState()
		const newOrderId = currentState.orderId
		const orderStatus = currentState.orderIdsList[newOrderId]
		const newStatus = currentState.status

		if (newOrderId && this.currentOrderStatus[newOrderId] !== orderStatus) {
			this.publishStatusUpdateMessage()
			this.currentOrderStatus[newOrderId] = orderStatus
		} else if (this.currentStatus !== newStatus) {
			this.publishStatusUpdateMessage()
			this.currentStatus = newStatus
		}
	}

	startSendProcess () {
		const sendIntervalMs = state.getStateRaw().updates.sendInterval * 1000
		logger.info('Starting send process with sendInterval of', sendIntervalMs, 'ms')

		this.sendIntervalId = setInterval(async () => {
			const message = this.buildLocationUpdateMessage()
			this.locations = []

			if (message.locations.length > 0) {
				this.publishLocationUpdateMessage(message)
			}
		}, sendIntervalMs, this)

		// this interval is detached from the location interval and gets triggered as frequently
		// as when the status get updated
		this.sendStatusIntervalId = setInterval(async () => {
			this.trySendStatusUpdateMessage()
		}, 500, this)

		logger.debug(`Started send process interval with id ${this.sendIntervalId}`)
		logger.debug(`Started send status process interval with id ${this.sendStatusIntervalId}`)
	}

	stopSendProcess () {
		// stop the sender
		logger.debug(`Clearing send process interval with id ${this.sendIntervalId}`)
		clearInterval(this.sendIntervalId)
		logger.debug(`Clearing send status process interval with id ${this.sendStatusIntervalId}`)
		clearInterval(this.sendStatusIntervalId)

		// publish outstanding collected locations
		const message = this.buildLocationUpdateMessage()
		this.locations = []

		if (message.locations.length > 0) {
			this.publishLocationUpdateMessage(message)
		}

		// check if there was status change
		this.trySendStatusUpdateMessage()
	}

	startLocationCollectionProcess () {
		const captureFrequencyMs = state.getStateRaw().updates.captureFrequency * 1000
		logger.info('Starting Location collection process with captureFrequency of ', captureFrequencyMs, 'ms')

		this.locationUpdateIntervalId = setInterval(async () => {
			const currentState = state.getStateRaw()
			const params = currentState.params
			const [latitude, longitude, elevation] =
				await messageGenerator.getCoordinates(params.lat, params.long, params.range, currentState.status)

			this.locations.push({
				timestamp: Date.now(),
				latitude,
				longitude,
				elevation,
				spoofing_detected: false,
			})
		}, captureFrequencyMs, this)
		logger.debug(`Started location update interval with id ${this.locationUpdateIntervalId}`)
	}

	stopLocationCollectionProcess () {
		// stop collecting
		logger.debug(`Clearing location update interval with id ${this.locationUpdateIntervalId}`)
		clearInterval(this.locationUpdateIntervalId)
	}

	updatesConfigChanged (oldUpdatesConfig, newUpdatesConfig) {
		logger.info('UpdatesConfig changed. New config:', JSON.stringify(newUpdatesConfig))
	}

	updatesChanged (oldConfig, newConfig) {
		// captureFrequency changed
		if (oldConfig.captureFrequency !== newConfig.captureFrequency) {
			logger.info('captureFrequency changed from ', oldConfig.captureFrequency, 'to', newConfig.captureFrequency)

			// stop collection
			this.stopLocationCollectionProcess()

			// restart collection with new frequency
			this.startLocationCollectionProcess()
		}

		if (oldConfig.sendInterval !== newConfig.sendInterval) {
			logger.info('sendInterval changed from ', oldConfig.sendInterval, 'to', newConfig.sendInterval)

			// stop the send process
			this.stopSendProcess()

			// restart sending with new interval
			this.startSendProcess()
		}
	}

	publishLocationUpdateMessage (message) {
		logger.debug(`[${this.sendIntervalId}] Sending LOCATION_UPDATE message with`, message.locations.length, 'locations | status =', message.status)
		helper.publishMessage(
			this.device,
			`$aws/rules/${this.config.iotIngestRule}`,
			JSON.stringify(message),
		)
	}

	publishStatusUpdateMessage () {
		const message = state.generateChangeStatusMessage(this.driverId, this.driverIdentity)
		logger.debug(`[${this.sendStatusIntervalId}] Sending STATUS_CHANGE message with status`, message.status)
		helper.publishMessage(
			this.device,
			`$aws/rules/${this.config.iotDriverStatusUpdateRule}`,
			JSON.stringify(message),
		)
	}

	buildLocationUpdateMessage () {
		const currentState = state.getState()
		const orderStatus = currentState.orderId ? currentState.orderIdsList[currentState.orderId] : undefined

		return {
			type: 'LOCATION_UPDATE',
			locations: this.locations,
			status: orderStatus || currentState.status,
			driverId: this.driverId,
			driverIdentity: this.driverIdentity,
		}
	}
}

module.exports = Scheduler
