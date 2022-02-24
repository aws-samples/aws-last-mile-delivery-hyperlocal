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
import { aws_kinesis as kinesis, aws_dynamodb as ddb, aws_lambda as lambda, aws_events as events, aws_events_targets as events_targets } from 'aws-cdk-lib'
import { RestApi } from '@aws-play/cdk-apigateway'
import { namespaced } from '@aws-play/cdk-core'
import { SERVICE_NAME } from '@prototype/common'
import { DriverStatusChangeHandler } from './DriverStatusChangeHandler'
import { DriverCleanupLambda } from './DriverCleanupFunction'
import { SubMinuteExecutionStepFunction } from './SubMinuteExecutionStepFunction'

export interface DriverEventHandlerProps {
	readonly instantDeliveryProviderLocks: ddb.ITable
	readonly instantDeliveryProviderOrders: ddb.ITable
	readonly orderBatchStream: kinesis.IStream
	readonly eventBus: events.IEventBus
	readonly instantDeliveryProviderApi: RestApi
	readonly instantDeliveryProviderApiSecretName: string
	readonly instantDeliveryProviderOrdersStatusIndex: string
	readonly instantDeliveryProviderSettings: { [key: string]: string | number | boolean, }
	readonly iotEndpointAddress: string
}

export class DriverEventHandler extends Construct {
	readonly driverStatusHandler: lambda.IFunction

	readonly driverCleanupFunction: lambda.IFunction

	constructor (scope: Construct, id: string, props: DriverEventHandlerProps) {
		super(scope, id)

		const {
			orderBatchStream,
			instantDeliveryProviderLocks,
			instantDeliveryProviderOrders,
			eventBus,
			instantDeliveryProviderApi,
			instantDeliveryProviderOrdersStatusIndex,
			instantDeliveryProviderSettings,
			instantDeliveryProviderApiSecretName,
			iotEndpointAddress,
		} = props

		this.driverStatusHandler = new DriverStatusChangeHandler(this, 'DriverStatusChangeHandler', {
			dependencies: {
				instantDeliveryProviderOrders,
				instantDeliveryProviderApi,
				instantDeliveryProviderApiSecretName,
				eventBus,
				iotEndpointAddress,
			},
		})

		this.driverCleanupFunction = new DriverCleanupLambda(this, 'DriverCleanupLambda', {
			dependencies: {
				orderBatchStream,
				instantDeliveryProviderLocks,
				instantDeliveryProviderOrders,
				instantDeliveryProviderOrdersStatusIndex,
				driverAcknowledgeTimeoutInSeconds: instantDeliveryProviderSettings.driverAcknowledgeTimeoutInSeconds as number,
			},
		})

		new events.Rule(this, 'InstantDeliveryProviderDriverStatusChange', {
			ruleName: namespaced(this, 'driver-status-change-to-instant-delivery-provider'),
			description: 'Rule used by instant delivery provider to consume driver status update events',
			eventBus,
			enabled: true,
			targets: [new events_targets.LambdaFunction(this.driverStatusHandler)],
			eventPattern: {
				source: [SERVICE_NAME.DRIVER_SERVICE],
				detailType: ['DRIVER_STATUS_CHANGE'],
			},
		})

		const subMinuteExecutionStepFunction = new SubMinuteExecutionStepFunction(this, 'SubMinuteExecutionStepFunction', {
			targetLambda: this.driverCleanupFunction,
			timeoutInSeconds: instantDeliveryProviderSettings.driverCleanupIntervalInSeconds as number,
			stepFunctionIntervalInMinutes: instantDeliveryProviderSettings.subMinuteStepFunctionIntervalInMinutes as number,
		})

		new events.Rule(this, 'InstantDeliveryProviderCleanupFunction', {
			ruleName: namespaced(this, 'instant-delviery-provider-driver-cleanup'),
			description: 'Used to cleanup the driver state for those who never acknowledge the orders',
			targets: [new events_targets.SfnStateMachine(subMinuteExecutionStepFunction.stepFunction)],
			schedule: events.Schedule.cron({ minute: `*/${instantDeliveryProviderSettings.subMinuteStepFunctionIntervalInMinutes}` }),
		})
	}
}
