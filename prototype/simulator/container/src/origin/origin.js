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
const logger = require('../common/utils/logger')
const ddb = require('../common/lib/dynamoDB')
const helper = require('../common/helper')
const commandHandler = require('./commands').default

class Origin {
	constructor (config, params, userData, managerInstance, originPassword) {
		this.params = params
		this.config = config
		this.userData = userData
		this.originManager = managerInstance
		this.originPassword = originPassword
	}

	get inputParams () {
		return this.params
	}

	get manager () {
		return this.originManager
	}

	async init () {
		const { creds, usr } = await helper.setupLogin(
			this.userData.email,
			this.originPassword,
		)

		this.cognitoUser = usr
		this.userData.creds = creds
		this.userData.clientId = `${this.userData.identity}:` + Date.now()
	}

	async refreshToken (that) {
		logger.info('Refresh token')

		const session = await helper.refreshUserSession(that.cognitoUser)
		const creds = await helper.refreshCredentials(that.userData.creds)

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
		await ddb.removeField(this.config.originTable, this.userData.ID, 'executionId')
		await ddb.updateItem(this.config.originTable, this.userData.ID, {})

		clearInterval(this.interval)
	}

	async updateStatus (status) {
		await helper.publishMessage(
			this.device,
			`$aws/rules/${this.config.originStatusUpdateRule}`,
			JSON.stringify({
				type: 'STATUS_CHANGE',
				originId: this.userData.ID,
				identity: this.userData.identity,
				area: this.userData.area,
				status,
				timestamp: Date.now(),
			}),
		)
	}

	async orderAck (status, orderId) {
		await helper.publishMessage(
			this.device,
			`$aws/rules/${this.config.originStatusUpdateRule}`,
			JSON.stringify({
				type: 'ORDER_ACK',
				orderId,
				originId: this.userData.ID,
				identity: this.userData.identity,
				area: this.userData.area,
				status,
				timestamp: Date.now(),
			}),
		)
	}
}

module.exports = Origin
