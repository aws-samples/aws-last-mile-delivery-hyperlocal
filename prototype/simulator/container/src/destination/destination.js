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
const dayjs = require('dayjs')
const logger = require('../common/utils/logger')
const helper = require('../common/helper')
const ddb = require('../common/lib/dynamoDB')
const requestHelper = require('./helper/request')
const utils = require('./utils')
const { sleep } = require('../common/utils')
const commandHandler = require('./commands').default

class Destination {
	constructor (config, params, userData, managerInstance) {
		this.params = params
		this.config = config
		this.userData = userData
		this.destinationManager = managerInstance
		this.cognitoUser = {}
	}

	get manager () {
		return this.destinationManager
	}

	async init () {
		const { creds, usr } = await helper.setupLogin(
			this.userData.email,
			this.config.destinationPassword,
		)

		this.cognitoUser = usr
		this.userData.creds = creds
		this.userData.clientId = `${this.userData.identity}:` + Date.now()

		// if event file is not present would generate orders based on the time interval
		if (!this.params.eventsFilePath) {
			this.orderInterval = setInterval(
				this.sendOrder.bind(this),
				utils.getMsFromParams(this.params),
			)
		} else {
			// otherwise replay the events after waiting 2 seconds
			setTimeout(
				this.replayEvents.bind(this),
				2000,
			)
		}
	}

	async replayEvents () {
		logger.info('Replaying event file')

		const nowTime = Number(dayjs().format('HHmmss')) - 2 // seconds tolerance for the preparation phase
		const events = await helper.loadRemoteFile(this.config.simulatorConfigBucket, this.params.eventsFilePath)
		const validOrders = events.orders.map((q) => ({
			...q,
			payload: {
				...q.payload,
				bookedAt: Number(dayjs(q.payload.bookedAt).format('HHmmssSSS')),
			},
		}))
		.filter(q => {
			const bookedTimeSec = Math.floor(q.payload.bookedAt / 1000)

			return bookedTimeSec > nowTime
		}).sort((a, b) => {
			return a.payload.bookedAt - b.payload.bookedAt
		}).reduce((acc, curr) => {
			const bookedTimeSec = Math.floor(curr.payload.bookedAt / 1000)

			if (!acc[bookedTimeSec]) {
				acc[bookedTimeSec] = [curr]
			} else {
				acc[bookedTimeSec].push(curr)
			}

			return acc
		}, {})

		logger.debug('Original Events: ', events.length)
		logger.debug('Events to play: ', validOrders.length)

		// start to send orders every
		this.orderInterval = setInterval(async () => {
			const nowInSeconds = Number(dayjs().format('HHmmss'))

			// if there are orders to send during this "second", will send them altogether
			if (validOrders[nowInSeconds]) {
				const promises = validOrders[nowInSeconds].map(({ origin, destination, payload }) => requestHelper.createOrder(
					origin,
					destination,
					payload,
					this.cognitoUser.signInUserSession.getIdToken().getJwtToken(),
				))
				const results = await Promise.all(promises.map(p => p.catch(e => e)))
				const errors = results.filter(result => result instanceof Error)

				logger.info(`Batch ${nowInSeconds} sent with ${validOrders[nowInSeconds].length} orders`)

				if (errors) {
					logger.error(`Errors on batch ${nowInSeconds}, ${errors.length} orders were not sent (total ${validOrders[nowInSeconds].length})`)
					logger.error(errors)
				}
			}
		}, 1000)
	}

	async sendOrder () {
		try {
			const origin = await requestHelper.getRandomOrigin(
				this.userData.area,
				this.cognitoUser.signInUserSession.getIdToken().getJwtToken(),
			)

			const res = await requestHelper.createOrder(
				{
					id: origin.ID,
					lat: origin.lat,
					long: origin.long,
					tags: origin.tags,
				},
				{
					id: this.userData.ID,
					lat: this.userData.lat,
					long: this.userData.long,
				},
				this.cognitoUser.signInUserSession.getIdToken().getJwtToken(),
			)

			logger.info('Order submitted: ', res)
		} catch (err) {
			logger.error('Error submitting the order: ', err.toString())

			if (err.response) {
				logger.error(err.response.data)
				logger.error(err.response.status)
				logger.error(err.response.headers)
			}
		}
	}

	async refreshToken (that) {
		logger.info('Refresh token')

		const session = await helper.refreshUserSession(that.cognitoUser)
		const creds = await helper.refreshCredentials(that.userData.creds)

		logger.log(session)
		logger.log(creds)

		return [session, creds]
	}

	async connect () {
		const { clientId, identity, creds } = this.userData
		const personalTopic = `${identity}/messages`
		const commonTopic = 'broadcast'

		this.handler = commandHandler(personalTopic, commonTopic)
		this.device = AwsIot.device({
			clientId,
			host: this.config.iotHost,
			protocol: 'wss',
			accessKeyId: creds.data.Credentials.AccessKeyId,
			secretKey: creds.data.Credentials.SecretKey,
			sessionToken: creds.data.Credentials.SessionToken,
		})

		this.device.on('connect', async () => {
			logger.info(`Connected to IoT Core: ${identity}`)
			this.device.subscribe([
				personalTopic,
				commonTopic,
			])

			await this.updateStatus('ONLINE')
		})

		this.device.on('message', async (topic, payload) => {
			logger.log('received message: ', topic, payload.toString())

			const message = JSON.parse(payload.toString())

			if (!(this.handler[topic] && this.handler[topic][message.type])) {
				logger.error(`Cannot find handler for topic=${topic} and type=${message.type}`)

				return
			}

			await this.handler[topic][message.type](message.payload, this)
		})

		this.interval = setInterval(() => this.refreshToken(this), 30 * 60 * 1000)
	}

	async disconnect () {
		await this.updateStatus('OFFLINE')
		await ddb.removeField(this.config.destinationTable, this.userData.ID, 'executionId')
		await ddb.updateItem(this.config.destinationTable, this.userData.ID, {})

		clearInterval(this.orderInterval)
		clearInterval(this.interval)
	}

	async updateStatus (status) {
		await helper.publishMessage(
			this.device,
			`$aws/rules/${this.config.destinationStatusUpdateRule}`,
			JSON.stringify({
				type: 'STATUS_CHANGE',
				destinationId: this.userData.ID,
				identity: this.userData.identity,
				area: this.userData.area,
				status,
				timestamp: Date.now(),
			}),
		)
	}
}

module.exports = Destination
