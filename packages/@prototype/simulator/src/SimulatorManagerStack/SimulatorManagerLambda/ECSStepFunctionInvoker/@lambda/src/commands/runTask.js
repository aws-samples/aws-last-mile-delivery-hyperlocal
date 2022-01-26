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
const ecs = require('../lib/ecs')
const config = require('../config')
/* {
	"size": 10,
	"procNum": 3,
	"area": {
			"lat": -6.172625,
			"long": 106.798288,
			"range": 12
	}
} */

const execute = async (payload) => {
	const { size, procNum, area } = payload

	try {
		const res = await ecs.runTask(
			size,
			config.clusterName,
			config.taskDefinitionName,
			config.containerName,
			config.subnets,
			[config.securityGroup],
			procNum,
			area,
		)

		const { failures, tasks } = res

		return {
			failures,
			tasks: tasks.map(q => q.taskArn).flat(),
		}
	} catch (err) {
		console.err('Error starting the task')
		console.err(err)

		return {
			failures: [err.message],
		}
	}
}

module.exports = {
	execute,
}
