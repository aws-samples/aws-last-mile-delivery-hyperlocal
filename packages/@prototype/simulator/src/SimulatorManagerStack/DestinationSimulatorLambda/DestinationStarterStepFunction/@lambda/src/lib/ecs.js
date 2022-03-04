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

const ecs = new aws.ECS()

const runTask = (
	cnt,
	config,
	executionId,
	orderRate,
	orderInterval,
	rejectionRate,
	eventsFilePath,
) => {
	console.debug(`Starting ECS tasks, count: ${cnt}, num of processes per container: ${executionId}`)

	return ecs.runTask({
		cluster: config.clusterName,
		launchType: 'FARGATE',
		taskDefinition: config.taskDefinitionName,
		count: cnt,
		platformVersion: 'LATEST',
		networkConfiguration: {
			awsvpcConfiguration: {
				subnets: config.subnets,
				securityGroups: [config.securityGroup],
				assignPublicIp: 'ENABLED',
			},
		},
		overrides: {
			containerOverrides: [
				{
					name: config.containerName,
					command: ['/bin/sh', '-c', '/usr/src/app/start.sh'],
					environment: [
						{ name: 'PROC_NUM', value: '1' },
						{ name: 'EXECUTION_ID', value: `${executionId}` },
						{ name: 'ORDER_RATE', value: `${orderRate}` },
						{ name: 'ORDER_INTERVAL', value: `${orderInterval}` },
						{ name: 'REJECTION_RATE', value: `${rejectionRate}` },
						{ name: 'SIMULATOR_API', value: `${config.simulatorApi}` },
						{ name: 'SIMULATOR_CONFIG_BUCKET', value: `${config.simulatorConfigBucket}` },
						{ name: 'EVENTS_FILE_PATH', value: eventsFilePath ? `${eventsFilePath}` : '' },
						// TODO: change in prod
						{ name: 'LOG_LEVEL', value: 'verbose' },
					],
				},
			],
		},
	}).promise()
}

module.exports = {
	runTask,
}
