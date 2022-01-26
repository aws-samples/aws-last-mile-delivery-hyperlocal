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
// TODO: to delete
// const { Command } = require('commander')
// const AwsIot = require('aws-iot-device-sdk')
// const config = require('./config')
// const aws = require('./lib/aws-sdk')
// const logger = require('./utils/logger')
// const helper = require('./helper')
// const stateManager = require('./state')
// const Scheduler = require('./scheduler')
// const commandHandler = require('./commands').default

// const program = new Command()
// program
// .option('-la, --lat <latitude>', 'Latitude')
// .option('-lo, --long <longitude>', 'Longitude')
// .option('-r, --range <range>', 'Range in meters')
// program.parse(process.argv)
// const options = program.opts()

// const params = {
// 	lat: process.env.LAT != null ? parseFloat(process.env.LAT) : options.lat,
// 	long: process.env.LONG != null ? parseFloat(process.env.LONG) : options.long,
// 	range: process.env.RANGE != null ? parseFloat(process.env.RANGE) : options.range,
// }

// stateManager.setState('params', params)

// logger.debug('Current config:', config)

// let device
// let scheduler

// const connect = (identityId, sub) => {
// 	logger.info('CONNECT :: identityId =', identityId, ' driverId =', sub)

// 	const clientId = `${identityId}:` + Date.now()
// 	const personalTopic = `${identityId}/messages`
// 	const commonTopic = 'broadcast'
// 	const handler = commandHandler(personalTopic, commonTopic)

// 	device = AwsIot.device({
// 		clientId,
// 		host: config.iotHost,
// 		protocol: 'wss',
// 		accessKeyId: aws.config.credentials.accessKeyId,
// 		secretKey: aws.config.credentials.secretAccessKey,
// 		sessionToken: aws.config.credentials.sessionToken,
// 	})

// 	device.on('connect', () => {
// 		logger.info('')
// 		logger.info('Connected to IoT Core')
// 		device.subscribe([
// 			personalTopic,
// 			commonTopic,
// 		])

// 		if (scheduler != null) {
// 			scheduler.stopLocationCollectionProcess()
// 			scheduler.stopSendProcess()
// 			scheduler = null
// 		}

// 		logger.info('Current updater config', stateManager.getStateRaw().updates)

// 		scheduler = new Scheduler({
// 			device,
// 			driverId: sub,
// 			driverIdentity: identityId,
// 		})

// 		scheduler.startLocationCollectionProcess()
// 		scheduler.startSendProcess()
// 	})

// 	device.on('message', async (topic, payload) => {
// 		logger.log('received message: ', topic, payload.toString())

// 		const message = JSON.parse(payload.toString())

// 		await handler[topic][message.type](message.payload)
// 	})
// }

// (async () => {
// 	try {
// 		const [identity, user] = await helper.setupIdentity()
// 		const remoteConfig = await helper.loadRemoteConfig()
// 		stateManager.setState('updatesConfig', remoteConfig, false)
// 		stateManager.setState('updates', remoteConfig.passiveState, false)

// 		connect(identity, user.attributes.sub)
// 	} catch (err) {
// 		logger.error(err)
// 	}
// })()
