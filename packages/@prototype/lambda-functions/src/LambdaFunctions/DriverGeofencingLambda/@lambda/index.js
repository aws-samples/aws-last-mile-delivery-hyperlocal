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
const { DRIVERAPP_MESSAGE_TYPE } = require('/opt/lambda-utils')
const { performGeofencing } = require('./geofencing')

const handler = async (event, context) => {
	if (event.Records === undefined) {
		return context.fail(`'Records' not found in event object: ${JSON.stringify(event)}`)
	}

	const { Records } = event

	let data
	let kinesisData
	for (const record of Records) {
		try {
			// Kinesis data is base64 encoded so decode here
			kinesisData = Buffer.from(record.kinesis.data, 'base64').toString('utf-8')
			data = JSON.parse(kinesisData)

			console.debug(`Data payload: ${JSON.stringify(data, null, 2)}`) // TODO: remove this for PROD
		} catch (err) {
			console.error(`Record from kinesis is malformatted (JSON parse failure). Skipping. Data received: ${kinesisData}`)
			continue
		}

		if (!recordValid(data)) {
			console.error(`Record from kinesis is not valid. Skipping. Data received: ${JSON.stringify(data)}`)
			continue
		}

		try {
			switch (data.type) {
				case DRIVERAPP_MESSAGE_TYPE.LOCATION_UPDATE: {
					try {
						await performGeofencing(data)
					} catch (err) {
						console.error(`Error performing geofencing :: ${data.type}`)
						console.error(err)
					}

					break
				}
				default:
					console.warn(`Unsupported data type: ${JSON.stringify(data)}. Dropping.`)
					break
			}
		} catch (err) {
			console.error(`Error updating Elasticache :: ${data.type} :: ${JSON.stringify(err)}`)
		}
	}
}

const recordValid = (record) => {
	return !(record.type == null || record.driverId == null)
}
exports.handler = handler
