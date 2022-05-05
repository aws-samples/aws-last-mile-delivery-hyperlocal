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
import { Duration, aws_iam as iam, aws_lambda as lambda, aws_stepfunctions as stepfunctions, aws_stepfunctions_tasks as tasks } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'

export interface DispatchEngineOrchestratorManagerProps {
	readonly orchestratorHelper: lambda.IFunction
	readonly orderDispatchTimeoutInMinutes: number
}

export class DispatchEngineOrchestratorManager extends Construct {
	public readonly stepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: DispatchEngineOrchestratorManagerProps) {
		super(scope, id)

		const {
			orderDispatchTimeoutInMinutes,
			orchestratorHelper,
		} = props

		const stepFunctionRole = new iam.Role(
			this,
			'stepFunctionRole',
			{
				assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
			},
		)

		const dispatchEngineInvoke = new tasks.LambdaInvoke(this, 'InvokeDispatchEngine', {
			lambdaFunction: orchestratorHelper,
			resultPath: '$.dispatchEngineInvoke',
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'invokeDispatch',
					payload: {
						'batchId.$': '$.batchId',
						'executionId.$': '$$.Execution.Id',
					},
				},
			},
		})

		const dispachEngineQuery = new tasks.LambdaInvoke(this, 'QueryDispachEngine', {
			lambdaFunction: orchestratorHelper,
			resultPath: '$.dispatchEngine',
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'queryDispatch',
					payload: {
						'problemId.$': '$.dispatchEngineInvoke.problemId',
					},
				},
			},
		})

		const broadcastAssignedOrderToDrivers = new tasks.LambdaInvoke(this, 'BroadcastAssignedOrderToDrivers', {
			lambdaFunction: orchestratorHelper,
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'broadcastToDrivers',
					payload: {
						'jobId.$': '$.jobId',
						'problemId.$': '$.problemId',
					},
				},
			},
		})

		const waitXSeconds = new stepfunctions.Wait(this, 'WaitXSeconds', {
			time: stepfunctions.WaitTime.duration(Duration.seconds(5)),
		})

		const deliveryJobsIterator = new stepfunctions.Map(this, 'DeliveryJobsIterator', {
			itemsPath: '$.dispatchEngine.deliveryJobs',
		})

		const definition = dispatchEngineInvoke
		.next(
			waitXSeconds.next(dispachEngineQuery),
		)
		.next(
			new stepfunctions.Choice(this, 'HasProblemBeenSolved?')
			.when(
				stepfunctions.Condition.booleanEquals('$.dispatchEngine.inProgress', true),
				waitXSeconds,
			).otherwise(
				deliveryJobsIterator.iterator(
					broadcastAssignedOrderToDrivers,
				),
			),
		)

		this.stepFunction = new stepfunctions.StateMachine(this, 'SameDayDispatchEngineOrchestratorStepFunction', {
			stateMachineName: namespaced(this, 'SameDayDispatchEngineOrchestratorStepFunction'),
			definition,
			role: stepFunctionRole,
			timeout: Duration.minutes(orderDispatchTimeoutInMinutes),
		})
	}
}
