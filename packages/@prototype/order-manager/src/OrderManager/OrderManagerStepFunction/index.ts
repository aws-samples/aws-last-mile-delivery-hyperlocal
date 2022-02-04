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

export interface OrderManagerStepFunctionProps {
	readonly orderManagerHelper: lambda.IFunction
	readonly providerRuleEngine: lambda.IFunction
	readonly orderManagerSettings: { [key: string]: string | number | boolean, }
}

export class OrderManagerStepFunction extends Construct {
	public readonly stepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: OrderManagerStepFunctionProps) {
		super(scope, id)

		const {
			orderManagerHelper,
			providerRuleEngine,
			orderManagerSettings,
		} = props

		const stepFunctionRole = new iam.Role(
			this,
			'stepFunctionRole',
			{
				assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
			},
		)

		const notifyOrderRejected = new tasks.LambdaInvoke(this, 'NotifyOrderRejected', {
			comment: 'Send message to event bridge to notify order rejection',
			lambdaFunction: orderManagerHelper,
			resultPath: '$.restaurantNotification',
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'notifyOrderRejected',
					payload: {
						'orderId.$': '$$.Execution.Input.orderId',
						reason: 'Rejected by restaurant',
					},
				},
			},
		})

		const sendOrderToRestaurant = new tasks.LambdaInvoke(this, 'SendOrderToRestaurant', {
			comment: 'SendOrderToRestaurant (wait for a callback)',
			integrationPattern: stepfunctions.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
			lambdaFunction: orderManagerHelper,
			// TODO: change in production
			// it's the timeout that is used for the restaurant to ack the order
			// if a reject/accept event doesn't come by then, the order will be rejected
			heartbeat: Duration.minutes(orderManagerSettings.restaurantTimeoutInMinutes as number),
			resultPath: '$.restaurantCallback',
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'notifyRestaurant',
					payload: {
						token: stepfunctions.JsonPath.taskToken,
						'orderId.$': '$$.Execution.Input.orderId',
						'restaurantId.$': '$$.Execution.Input.restaurant.id',
						'customerId.$': '$$.Execution.Input.customer.id',
					},
				},
			},
		}).addCatch(notifyOrderRejected, {
			resultPath: '$.notifyRestaurantError',
			errors: ['States.Timeout'],
		})

		const findProvider = new tasks.LambdaInvoke(this, 'FindProvider', {
			comment: 'Invoke the provider rule engine to retrieve the provider to use for the order',
			resultPath: '$.providerRuleEngine',
			payloadResponseOnly: true,
			lambdaFunction: providerRuleEngine,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'findProvider',
					'payload.$': '$$.Execution.Input',
				},
			},
		}).addRetry({
			maxAttempts: 5,
			errors: [
				'States.Runtime',
				'Lambda.Unknown',
				'States.TaskFailed',
			],
		})
		.addCatch(notifyOrderRejected, {
			resultPath: '$.findProviderError',
			errors: ['States.ALL'],
		})

		const sendOrderToProvider = new tasks.LambdaInvoke(this, 'SendOrderToProvider', {
			comment: 'Invoke the provider rule engine to send the order to the selected provider',
			resultPath: '$.providerRuleEngineOrderResult',
			lambdaFunction: providerRuleEngine,
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'sendToProvider',
					payload: {
						'providerName.$': '$.providerRuleEngine.provider',
						'orderData.$': '$$.Execution.Input',
					},
				},
			},
		}).addRetry({
			maxAttempts: 5,
			errors: [
				'States.Runtime',
				'Lambda.Unknown',
				'States.TaskFailed',
			],
		})
		.addCatch(findProvider, {
			resultPath: '$.sendToProviderError',
			errors: ['States.ALL'],
		})

		const cancelOrderFromProvider = new tasks.LambdaInvoke(this, 'CancelOrderFromProvider', {
			comment: 'Invoke the provider rule engine to cancel the order to the selected provider',
			resultPath: '$.providerRuleEngineCancellation',
			lambdaFunction: providerRuleEngine,
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'cancelOrderFromProvider',
					payload: {
						'providerName.$': '$.providerRuleEngine.provider',
						'orderId.$': '$$.Execution.Input.orderId',
					},
				},
			},
		}).addRetry({
			maxAttempts: 5,
			errors: [
				'States.Runtime',
				'Lambda.Unknown',
				'States.TaskFailed',
			],
		})
		.addCatch(findProvider, {
			resultPath: '$.cancelOrderFromProviderError',
			errors: ['States.ALL'],
		})

		const orderCancelled = new tasks.LambdaInvoke(this, 'NotifyOrderCancelled', {
			comment: 'Send message to event bridge to notify order cancellation',
			lambdaFunction: orderManagerHelper,
			resultPath: '$.orderNotification',
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'notifyOrderCancelled',
					payload: {
						'orderId.$': '$$.Execution.Input.orderId',
						reason: 'Cancelled by provider',
					},
				},
			},
		})

		const waitForOrderStatusCallback = new tasks.LambdaInvoke(this, 'WaitForOrderStatusCallback', {
			integrationPattern: stepfunctions.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
			lambdaFunction: orderManagerHelper,
			// TODO: to change in production
			// this is the timeout for the provider feedback
			// if we don't get an update by then, it will find a new provider
			heartbeat: Duration.minutes(orderManagerSettings.providerTimeoutInMinutes as number),
			resultPath: '$.orderCallback',
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'initiateOrderCallback',
					payload: {
						token: stepfunctions.JsonPath.taskToken,
						'orderId.$': '$$.Execution.Input.orderId',
					},
				},
			},
		}).addCatch(
			cancelOrderFromProvider.next(orderCancelled),
			{
				resultPath: '$.orderCallbackError',
				errors: ['States.Timeout'],
			},
		)

		const orderDelivered = new tasks.LambdaInvoke(this, 'NotifyOrderDelivered', {
			comment: 'Send message to event bridge to notify success delivery',
			lambdaFunction: orderManagerHelper,
			resultPath: '$.orderNotification',
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'notifyOrderDelivered',
					payload: {
						'orderId.$': '$$.Execution.Input.orderId',
					},
				},
			},
		})

		const notifyProviderFound = new tasks.LambdaInvoke(this, 'NotifyProviderFound', {
			comment: 'Send message to event bridge to notify that a provider has been found',
			lambdaFunction: orderManagerHelper,
			resultPath: '$.providerNotification',
			payloadResponseOnly: true,
			payload: {
				type: stepfunctions.InputType.OBJECT,
				value: {
					cmd: 'notifyProviderFound',
					payload: {
						'orderId.$': '$$.Execution.Input.orderId',
						'provider.$': '$.providerRuleEngine.provider',
					},
				},
			},
		})

		const orderStatusChoice = new stepfunctions.Choice(this, 'CheckOrderStatus')
		.when(
			stepfunctions.Condition.stringEquals('$.orderCallback.orderStatus', 'DELIVERED'),
			orderDelivered,
		)
		.when(
			stepfunctions.Condition.stringEquals('$.orderCallback.orderStatus', 'CANCELLED'),
			orderCancelled.next(findProvider),
		)
		.when(
			stepfunctions.Condition.stringEquals('$.orderCallback.orderStatus', 'REJECTED'),
			notifyOrderRejected,
		).otherwise(waitForOrderStatusCallback)

		const providerOutputChoice = new stepfunctions.Choice(this, 'CheckProviderRuleEngineOutput')
		.when(
			stepfunctions.Condition.isNotNull('$.providerRuleEngine.provider'),
			notifyProviderFound
			.next(sendOrderToProvider)
			.next(waitForOrderStatusCallback)
			.next(orderStatusChoice),
		)
		.when(
			stepfunctions.Condition.isNull('$.providerRuleEngine.provider'),
			findProvider,
		)

		const definition = sendOrderToRestaurant
		.next(
			new stepfunctions.Choice(this, 'IsOrderAcceptedByRestaurant')
			.when(
				stepfunctions.Condition.stringEquals('$.restaurantCallback.restaurantStatus', 'ACCEPTED'),
				findProvider
				.next(providerOutputChoice),
			)
			.otherwise(notifyOrderRejected),
		)

		this.stepFunction = new stepfunctions.StateMachine(this, 'OrderManagerStepFunction', {
			stateMachineName: namespaced(this, 'OrderManagerStepFunction'),
			definition,
			role: stepFunctionRole,
		})
	}
}
