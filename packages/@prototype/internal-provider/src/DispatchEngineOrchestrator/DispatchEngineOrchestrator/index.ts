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

export interface DispatchEngineOrchestratorManagerProps {
  readonly ochestratorHelper: lambda.IFunction
}

export class DispatchEngineOrchestratorManager extends cdk.Construct {
	public readonly stepFunction: step.StateMachine

	constructor (scope: cdk.Construct, id: string, props: DispatchEngineOrchestratorManagerProps) {
		super(scope, id)

		const {
			ochestratorHelper,
		} = props

		const stepFunctionRole = new iam.Role(
			this,
			'stepFunctionRole',
			{
				assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
			},
		)

		const dispatchEngineInvoke = new tasks.LambdaInvoke(this, 'InvokeDispatchEngine', {
			lambdaFunction: ochestratorHelper,
			resultPath: '$.dispatchEngineInvoke',
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
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
			lambdaFunction: ochestratorHelper,
			resultPath: '$.dispatchEngine',
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
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
			lambdaFunction: ochestratorHelper,
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
				value: {
					cmd: 'sendToKinesis',
					payload: {
						'orders.$': 'States.Array($)',
					},
				},
			},
		})

		const sendConflictOrdersToKinesis = new tasks.LambdaInvoke(this, 'SendConflictOrdersToKinesis', {
			lambdaFunction: ochestratorHelper,
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
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
			lambdaFunction: ochestratorHelper,
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
				value: {
					cmd: 'sendToDriver',
					payload: {
						'driverId.$': '$.driverId',
						'driverIdentity.$': '$.driverIdentity',
						'driverLocation.$': '$.driverLocation',
						'orders.$': '$.orders',
					},
				},
			},
		})

		const updateOrdersStatus = new tasks.LambdaInvoke(this, 'UpdateOrdersStatus', {
			lambdaFunction: ochestratorHelper,
			resultPath: '$.orderUpdated',
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
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
			lambdaFunction: ochestratorHelper,
			resultPath: '$.driverStatus',
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
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
			lambdaFunction: ochestratorHelper,
			resultPath: '$.releaseDriverLock',
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
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
			lambdaFunction: ochestratorHelper,
			resultPath: '$.releaseOrdersLock',
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
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

		const setOptionalParametersToNull = new step.Pass(this, 'SetOptionalParametersToNull', {
			resultPath: '$.releaseOrdersLock',
			result: {
				value: {
					released: null,
				},
			},
		})

		const batchOrderStatusChoice = new step.Choice(this, 'BatchOrderStatusChoice')
		.when(
			step.Condition.stringEquals('$.orderUpdated.status', 'ALL_ASSIGNED'),
			sendAssignedOrderToDriver,
		)
		.when(
			step.Condition.stringEquals('$.orderUpdated.status', 'ANY_CONFLICT'),
			releaseDriverLock
			.next(releaseOrdersLock)
			.next(sendConflictOrdersToKinesis),
		)

		const driverStatusChoice = new step.Choice(this, 'DriverStatusChoice')
		.when(
			step.Condition.booleanEquals('$.driverStatus.locked', true),
			updateOrdersStatus
			.next(batchOrderStatusChoice),
		).otherwise(
			setOptionalParametersToNull.next(sendConflictOrdersToKinesis),
		)

		const waitXSeconds = new step.Wait(this, 'WaitXSeconds', {
			time: step.WaitTime.duration(cdk.Duration.seconds(5)),
		})

		const unassignedOrdersIterator = new step.Map(this, 'UnassignedOrdersIterator', {
			itemsPath: '$.unassigned',
		})

		const assignedOrdersIterator = new step.Map(this, 'AssignedOrdersIterator', {
			itemsPath: '$.assigned',
		})

		const unassignedAndAssignedOrders = new step.Parallel(this, 'ExecuteUnassignedAndAssignedOrders', {
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
			new step.Choice(this, 'HasProblemBeenSolved?')
			.when(
				step.Condition.booleanEquals('$.dispatchEngine.inProgress', true),
				waitXSeconds,
			).otherwise(
				unassignedAndAssignedOrders,
			),
		)

		this.stepFunction = new step.StateMachine(this, 'DispatchEngineOrchestratorStepFunction', {
			stateMachineName: namespaced(this, 'DispatchEngineOrchestratorStepFunction'),
			definition,
			role: stepFunctionRole,
		})
	}
}
