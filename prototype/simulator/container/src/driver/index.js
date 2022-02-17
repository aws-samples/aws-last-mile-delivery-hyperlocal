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
const AwsIot = require('aws-iot-device-sdk')
const aws = require('../common/lib/aws-sdk')
const logger = require('../common/utils/logger')
const helper = require('../common/helper')
const stateManager = require('./state')
const commandHandler = require('./commands').default
const Scheduler = require('./scheduler')

class DriverApp {
	constructor (config, options) {
		const params = {
			lat: config.lat || options.lat,
			long: config.long || options.long,
			range: config.range || options.range,
		}

		stateManager.setState('params', params)

		this.config = config
		this.device = null
		this.scheduler = null
	}

	async init () {
		const [identity, user] = await helper.setupIdentity(this.config.iotPolicyName, this.config.baseUsername)
		const remoteConfig = await helper.loadRemoteFile(this.config.updateConfigBucket, this.config.updateConfigPath)

		stateManager.setState('updatesConfig', remoteConfig, false)
		stateManager.setState('updates', remoteConfig.passiveState, false)

		this.identityId = identity
		this.sub = user.attributes.sub
	}

	async connect () {
		logger.info('CONNECT :: identityId =', this.identityId, ' driverId =', this.sub)

		const clientId = `${this.identityId}:` + Date.now()
		const personalTopic = `${this.identityId}/messages`
		const commonTopic = 'broadcast'
		const handler = commandHandler(personalTopic, commonTopic)

		this.device = AwsIot.device({
			clientId,
			host: this.config.iotHost,
			protocol: 'wss',
			accessKeyId: aws.config.credentials.accessKeyId,
			secretKey: aws.config.credentials.secretAccessKey,
			sessionToken: aws.config.credentials.sessionToken,
		})

		this.device.on('connect', () => {
			logger.info('Connected to IoT Core')

			this.device.subscribe([
				personalTopic,
				commonTopic,
			])

			if (this.scheduler != null) {
				this.scheduler.stopLocationCollectionProcess()
				this.scheduler.stopSendProcess()
				this.scheduler = null
			}

			logger.info('Current updater config', stateManager.getStateRaw().updates)

			this.scheduler = new Scheduler(
				this.config,
				{
					device: this.device,
					driverId: this.sub,
					driverIdentity: this.identityId,
				},
			)

			this.scheduler.startLocationCollectionProcess()
			this.scheduler.startSendProcess()
		})

		this.device.on('message', async (topic, payload) => {
			logger.log('received message: ', topic, payload.toString())

			const message = JSON.parse(payload.toString())

			if (!(handler[topic] && handler[topic][message.type])) {
				logger.error(`Cannot find handler for topic=${topic} and type=${message.type}`)

				return
			}

			await handler[topic][message.type](message.payload)
		})
	}
}

module.exports = DriverApp
