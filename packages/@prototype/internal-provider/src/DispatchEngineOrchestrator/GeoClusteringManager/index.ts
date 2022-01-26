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
import * as cdk from '@aws-cdk/core'
import * as iam from '@aws-cdk/aws-iam'
import * as lambda from '@aws-cdk/aws-lambda'
import * as step from '@aws-cdk/aws-stepfunctions'
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks'
import { namespaced } from '@aws-play/cdk-core'

export interface GeoClusteringManagerProps {
  readonly ochestratorHelper: lambda.IFunction
  readonly dispatchEngineStepFunction: step.StateMachine
}

export class GeoClusteringManager extends cdk.Construct {
	public readonly stepFunction: step.StateMachine

	constructor (scope: cdk.Construct, id: string, props: GeoClusteringManagerProps) {
		super(scope, id)

		const {
			ochestratorHelper,
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
			lambdaFunction: ochestratorHelper,
			resultPath: '$.geoClustering',
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
				value: {
					cmd: 'geoClustering',
					payload: {
						'orders.$': '$.valid',
					},
				},
			},
		})

		const cancelOrders = new tasks.LambdaInvoke(this, 'CancelOrders', {
			lambdaFunction: ochestratorHelper,
			resultPath: '$.cancelled',
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
				value: {
					cmd: 'cancelOrders',
					payload: {
						'orders.$': '$.expired',
					},
				},
			},
		})

		const filterExpiredOrders = new tasks.LambdaInvoke(this, 'FilterExpiredOrders', {
			lambdaFunction: ochestratorHelper,
			resultPath: '$.filterExpiredOrders',
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
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
				type: step.InputType.OBJECT,
				value: {
					'parentExecutionId.$': '$$.Execution.Id',
					'centroid.$': '$.centroid',
					'orders.$': '$.orders',
				},
			},
		})

		const clusterIterator = new step.Map(this, 'ClusterIterator', {
			inputPath: '$.geoClustering',
			itemsPath: '$.clusters',
		})

		clusterIterator.iterator(executeDispachEngineOrchestrator)

		const expiredAndValidOrders = new step.Parallel(this, 'ExecuteExpiredAndValidOrders', {
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

		this.stepFunction = new step.StateMachine(this, 'GeoClusteringManagerStepFunction', {
			stateMachineName: namespaced(this, 'GeoClusteringManagerStepFunction'),
			definition,
			role: stepFunctionRole,
		})
	}
}
