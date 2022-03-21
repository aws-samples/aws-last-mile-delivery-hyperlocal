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
						'centroid.$': '$.centroid',
						'orders.$': '$.orders',
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
						'centroid.$': '$.centroid',
						'orders.$': '$.orders',
					},
				},
			},
		})

		// the following 2 tasks invoking the same commands are required to be replicated due to
		// the fact that these are inside different maps/parallel and cant' be shared across

		const sendUnassignedOrderToKinesis = new tasks.LambdaInvoke(this, 'SendUnassignedOrderToKinesis', {
			lambdaFunction: orchestratorHelper,
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'sendToKinesis',
					payload: {
						'orders.$': 'States.Array($)',
					},
				},
			},
		})

		const sendConflictOrdersToKinesis = new tasks.LambdaInvoke(this, 'SendConflictOrdersToKinesis', {
			lambdaFunction: orchestratorHelper,
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'sendToKinesis',
					payload: {
						'orders.$': '$.orders',
						'ordersReleased.$': '$.releaseOrdersLock.released',
					},
				},
			},
		})

		// end sendToKinesis cmd tasks

		const sendAssignedOrderToDriver = new tasks.LambdaInvoke(this, 'SendAssignedOrderToDriver', {
			lambdaFunction: orchestratorHelper,
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'sendToDriver',
					payload: {
						'driverId.$': '$.driverId',
						'driverIdentity.$': '$.driverIdentity',
						'orders.$': '$.orders',
						'segments.$': '$.segments',
						'route.$': '$.route',
					},
				},
			},
		})

		const updateOrdersStatus = new tasks.LambdaInvoke(this, 'UpdateOrdersStatus', {
			lambdaFunction: orchestratorHelper,
			resultPath: '$.orderUpdated',
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'updateOrdersStatus',
					payload: {
						'driverId.$': '$.driverId',
						'driverIdentity.$': '$.driverIdentity',
						'orders.$': '$.orders',
					},
				},
			},
		})
		const lockDriver = new tasks.LambdaInvoke(this, 'LockDriver', {
			lambdaFunction: orchestratorHelper,
			resultPath: '$.driverStatus',
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'lockDriver',
					payload: {
						'driverId.$': '$.driverId',
						'driverIdentity.$': '$.driverIdentity',
						'orders.$': '$.orders',
					},
				},
			},
		})
		const releaseDriverLock = new tasks.LambdaInvoke(this, 'ReleaseDriverLock', {
			lambdaFunction: orchestratorHelper,
			resultPath: '$.releaseDriverLock',
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'releaseDriverLock',
					payload: {
						'driverId.$': '$.driverId',
						'driverIdentity.$': '$.driverIdentity',
					},
				},
			},
		})
		const releaseOrdersLock = new tasks.LambdaInvoke(this, 'ReleaseOrdersLock', {
			lambdaFunction: orchestratorHelper,
			resultPath: '$.releaseOrdersLock',
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'releaseOrdersLock',
					payload: {
						'driverId.$': '$.driverId',
						'driverIdentity.$': '$.driverIdentity',
						'orders.$': '$.orders',
						'orderStatusList.$': '$.orderUpdated.statusList',
					},
				},
			},
		})

		const setOptionalParametersToNull = new stepfunctions.Pass(this, 'SetOptionalParametersToNull', {
			resultPath: '$.releaseOrdersLock',
			result: {
				value: {
					released: null,
				},
			},
		})

		const batchOrderStatusChoice = new stepfunctions.Choice(this, 'BatchOrderStatusChoice')
		.when(
			stepfunctions.Condition.stringEquals('$.orderUpdated.status', 'ALL_ASSIGNED'),
			sendAssignedOrderToDriver,
		)
		.when(
			stepfunctions.Condition.stringEquals('$.orderUpdated.status', 'ANY_CONFLICT'),
			releaseDriverLock
			.next(releaseOrdersLock)
			.next(sendConflictOrdersToKinesis),
		)

		const driverStatusChoice = new stepfunctions.Choice(this, 'DriverStatusChoice')
		.when(
			stepfunctions.Condition.booleanEquals('$.driverStatus.locked', true),
			updateOrdersStatus
			.next(batchOrderStatusChoice),
		).otherwise(
			setOptionalParametersToNull.next(sendConflictOrdersToKinesis),
		)

		const waitXSeconds = new stepfunctions.Wait(this, 'WaitXSeconds', {
			time: stepfunctions.WaitTime.duration(Duration.seconds(5)),
		})

		const unassignedOrdersIterator = new stepfunctions.Map(this, 'UnassignedOrdersIterator', {
			itemsPath: '$.unassigned',
		})

		const assignedOrdersIterator = new stepfunctions.Map(this, 'AssignedOrdersIterator', {
			itemsPath: '$.assigned',
		})

		const unassignedAndAssignedOrders = new stepfunctions.Parallel(this, 'ExecuteUnassignedAndAssignedOrders', {
			inputPath: '$.dispatchEngine',
			resultPath: '$.parallel',
		})

		unassignedAndAssignedOrders.branch(
			unassignedOrdersIterator.iterator(
				sendUnassignedOrderToKinesis,
			),
		)

		unassignedAndAssignedOrders.branch(
			assignedOrdersIterator.iterator(
				lockDriver.next(
					driverStatusChoice,
				),
			),
		)

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
				unassignedAndAssignedOrders,
			),
		)

		this.stepFunction = new stepfunctions.StateMachine(this, 'DispatchEngineOrchestratorStepFunction', {
			stateMachineName: namespaced(this, 'DispatchEngineOrchestratorStepFunction'),
			definition,
			role: stepFunctionRole,
			timeout: Duration.minutes(orderDispatchTimeoutInMinutes),
		})
	}
}
