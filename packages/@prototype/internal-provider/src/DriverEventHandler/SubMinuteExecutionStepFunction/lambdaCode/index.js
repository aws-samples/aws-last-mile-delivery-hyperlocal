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
const commands = {
	configureIterations: (paylad) => {
		console.log('Configure iterations command started')
		const { timeoutInSeconds, stepFunctionIntervalInMinutes } = paylad
		const maxIterations = Math.round((60 * stepFunctionIntervalInMinutes) / timeoutInSeconds)
		const msInMinute = 60 * 1000

		return {
			maxIterations,
			timeoutInMs: msInMinute / Math.round(maxIterations / stepFunctionIntervalInMinutes),
		}
	},
	waitForXSeconds: (payload) => {
		console.log('WaitForXSeconds command started')

		const { timeoutInMs } = payload

		return new Promise((resolve) => setTimeout(() => resolve(true), timeoutInMs))
	},
	incrementCurrentCounter: (payload) => {
		console.log('IncrementCurrentCounter command started')
		const { input } = payload
		const { currentCounter } = input
		let iteration = 0

		if (currentCounter && currentCounter.iteration) {
			iteration = currentCounter.iteration
		}

		return {
			iteration: ++iteration,
		}
	},
}

const handler = async (event, context) => {
	console.log('Execution started with the following payload')
	console.log(JSON.stringify(event))

	const { cmd, payload } = event

	if (!commands[cmd]) {
		console.error('Cannot find command: ', cmd)

		return
	}

	const res = await commands[cmd](payload)

	console.info('Execution completed: ', JSON.stringify(res))

	return res
}
exports.handler = handler
