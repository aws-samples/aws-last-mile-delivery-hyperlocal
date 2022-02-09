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
const config = require('../config')

const ecs = new aws.ECS()

const handler = (event, context) => {
	console.debug(JSON.stringify(event, null, 2))

	const { numOfInstances = 1 } = event

	try {
		const res = await runTask(
			numOfInstances,
			config.clusterName,
			config.taskDefinitionName,
			config.containerName,
			config.subnets,
			[config.securityGroup],
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

const runTask = (cnt, cluster, taskDefinition, containerName, subnets, securityGroups, args) => {
	console.debug(`Starting ECS tasks, count: ${cnt}`)

	return ecs.runTask({
		cluster,
		launchType: 'FARGATE',
		taskDefinition,
		count: cnt,
		platformVersion: 'LATEST',
		networkConfiguration: {
			awsvpcConfiguration: {
				subnets,
				securityGroups,
				assignPublicIp: 'ENABLED',
			},
		},
		overrides: {
			containerOverrides: [
				{
					name: containerName,
				},
			],
		},
	}).promise()
}

exports.handler = handler
