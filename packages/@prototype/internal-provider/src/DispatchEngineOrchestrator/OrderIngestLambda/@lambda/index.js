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

const stepFunctions = new aws.StepFunctions()

const startExecution = (input) => {
	return stepFunctions.startExecution({
		stateMachineArn: process.env.GEO_CLUSTERING_MANAGER_ARN,
		input: JSON.stringify(input),
	}).promise()
}

const handler = async (event, context) => {
	if (event.Records === undefined) {
		return context.fail(`'Records' not found in event object: ${JSON.stringify(event)}`)
	}

	const { Records } = event
	const dataArr = []

	for (const record of Records) {
		let data
		// Kinesis data is base64 encoded so decode here
		const kinesisData = Buffer.from(record.kinesis.data, 'base64').toString('utf-8')

		try {
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

		dataArr.push(data)
	}

	if (dataArr.length === 0) {
		console.warn('Resulting array is empty - possibly due to input error. Skipping')

		return { error: 'empty array' }
	}

	const res = await startExecution({
		orders: dataArr,
	})

	console.log('Execution started: ', res.executionArn)

	return { success: true }
}

const recordValid = (record) => {
	return !!record.orderId && record.customer && record.restaurant
}
exports.handler = handler
