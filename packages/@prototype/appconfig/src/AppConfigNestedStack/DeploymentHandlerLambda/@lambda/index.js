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
/* eslint-disable no-console */
const aws = require('aws-sdk')

const appconfig = new aws.AppConfig()
const s3 = new aws.S3()
let iotData

const appIds = (process.env.APP_IDS).split(',').map(v => v.trim())
const configBucket = process.env.CONFIG_BUCKET

exports.handler = async (event) => {
	console.log('AppConfig event handled', event)

	if (event.source === 'aws.appconfig') {
		const { detail: { eventName, eventSource, requestParameters } } = event

		if (eventName === 'StartDeployment' && eventSource === 'appconfig.amazonaws.com') {
			const { ConfigurationProfileId, EnvironmentId, ApplicationId } = requestParameters

			if (appIds.findIndex(e => e === ApplicationId) < 0) {
				console.log(`StartDeployment event originated from an unrecognized app with id '${ApplicationId}'. Supported app ids: ${JSON.stringify(appIds)}`)

				return
			}

			try {
				// retrieve latest config
				const config = await appconfig.getConfiguration({
					Application: ApplicationId,
					ClientId: 'appconfig-mqtt-broadcast-lambda',
					Configuration: ConfigurationProfileId,
					Environment: EnvironmentId,
				}).promise()

				const configObj = JSON.parse(config.Content.toString('utf8'))

				console.log('Latest config content ::', configObj)

				const environment = await appconfig.getEnvironment({
					ApplicationId,
					EnvironmentId,
				}).promise()

				console.log(`Retrieved environment obj: ${JSON.stringify(environment)}`)

				// save to S3
				const configBucketKey = `app/${ApplicationId}/env/${environment.Name}/config.json`
				await s3.putObject({
					Bucket: configBucket,
					Key: configBucketKey,
					Body: JSON.stringify(configObj),
				}).promise()

				console.log(`Config saved to ${configBucket} bucket under the key ${configBucketKey}`)

				// fan out on MQTT to connected devices
				const topic = 'broadcast'
				// const topic = `app/${ApplicationId}/env/${environment.Name}`
				console.debug(`Publishing config message to topic '${topic}'`)
				const iotDataClient = await createOrGetIoTData()
				await iotDataClient.publish({
					topic,
					payload: JSON.stringify({
						type: 'CONFIG_UPDATE',
						payload: configObj,
					}),
					qos: 1,
				}).promise()
			} catch (err) {
				console.error(`Error :: ${JSON.stringify(err)}`)
			}
		}
	}
}

const createOrGetIoTData = async () => {
	if (!iotData) {
		iotData = new aws.IotData({
			endpoint: process.env.IOT_ENDPOINT,
		})
	}

	return iotData
}
