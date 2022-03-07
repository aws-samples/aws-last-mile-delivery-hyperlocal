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
import { Construct } from 'constructs'
import { aws_iam as iam, aws_lambda as lambda, aws_stepfunctions as stepfunctions, aws_stepfunctions_tasks as tasks, Duration } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'

export interface GeoClusteringManagerProps {
  readonly orchestratorHelper: lambda.IFunction
  readonly dispatchEngineStepFunction: stepfunctions.StateMachine
}

export class GeoClusteringManager extends Construct {
	public readonly stepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: GeoClusteringManagerProps) {
		super(scope, id)

		const {
			orchestratorHelper,
			dispatchEngineStepFunction,
		} = props

		const stepFunctionRole = new iam.Role(
			this,
			'stepFunctionRole',
			{
				assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
			},
		)

		const geoClustering = new tasks.LambdaInvoke(this, 'GeoClustering', {
			lambdaFunction: orchestratorHelper,
			resultPath: '$.geoClustering',
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'geoClustering',
					payload: {
						'orders.$': '$.valid',
					},
				},
			},
		})

		const cancelOrders = new tasks.LambdaInvoke(this, 'CancelOrders', {
			lambdaFunction: orchestratorHelper,
			resultPath: '$.cancelled',
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'cancelOrders',
					payload: {
						'orders.$': '$.expired',
					},
				},
			},
		})

		const filterExpiredOrders = new tasks.LambdaInvoke(this, 'FilterExpiredOrders', {
			lambdaFunction: orchestratorHelper,
			resultPath: '$.filterExpiredOrders',
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'filterExpiredOrders',
					payload: {
						'orders.$': '$.orders',
					},
				},
			},
		})

		const executeDispachEngineOrchestrator = new tasks.StepFunctionsStartExecution(this, 'ExecuteDispachEngineOrchestrator', {
			stateMachine: dispatchEngineStepFunction,
			input: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					'parentExecutionId.$': '$$.Execution.Id',
					'centroid.$': '$.centroid',
					'orders.$': '$.orders',
				},
			},
		})

		const clusterIterator = new stepfunctions.Map(this, 'ClusterIterator', {
			inputPath: '$.geoClustering',
			itemsPath: '$.clusters',
		})

		clusterIterator.iterator(executeDispachEngineOrchestrator)

		const expiredAndValidOrders = new stepfunctions.Parallel(this, 'ExecuteExpiredAndValidOrders', {
			inputPath: '$.filterExpiredOrders',
			resultPath: '$.expiredOrValidOrders',
		})

		expiredAndValidOrders.branch(
			cancelOrders,
		)

		expiredAndValidOrders.branch(
			geoClustering.next(clusterIterator),
		)

		const definition = filterExpiredOrders.next(expiredAndValidOrders)

		this.stepFunction = new stepfunctions.StateMachine(this, 'GeoClusteringManagerStepFunction', {
			stateMachineName: namespaced(this, 'GeoClusteringManagerStepFunction'),
			definition,
			role: stepFunctionRole,
			// usually takes a few seconds
			timeout: Duration.minutes(5),
		})
	}
}
