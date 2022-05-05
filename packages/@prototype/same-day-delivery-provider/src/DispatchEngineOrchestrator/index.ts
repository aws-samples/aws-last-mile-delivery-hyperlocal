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
import { aws_dynamodb as ddb, aws_events as events, aws_elasticloadbalancingv2 as elb, aws_ec2 as ec2, aws_events_targets as events_targets, aws_sqs as sqs } from 'aws-cdk-lib'
import { RestApi } from '@aws-play/cdk-apigateway'
import { DispatchEngineOrchestratorManager } from './DispatchEngineOrchestrator'
import { OrderIngestValidatorLambda } from './OrderIngestValidatorLambda'
import { OrchestratorHelperLambda } from './OrchestratorHelperLambda'
import { namespaced } from '@aws-play/cdk-core'

export interface DispatchEngineOrchestratorProps {
	readonly sameDayDeliveryProviderOrders: ddb.ITable
	readonly sameDayDirectPudoDeliveryJobs: ddb.ITable
	readonly sameDayDeliveryProviderOrdersStatusPartitionIndex: string
	readonly sameDayDeliveryProviderOrdersBatchIdIndex: string
	readonly eventBus: events.IEventBus
	readonly sameDayDeliveryProviderApi: RestApi
	readonly iotEndpointAddress: string
	readonly sameDayDeliveryProviderApiSecretName: string
	readonly sameDayDeliveryProviderSettings: { [key: string]: string | number | boolean, }
	readonly dispatchEngineLB: elb.IApplicationLoadBalancer
	readonly graphhopperLB: elb.IApplicationLoadBalancer
	readonly vpc: ec2.IVpc
	readonly lambdaSecurityGroups: ec2.ISecurityGroup[]
	readonly geoTrackingRestApi: RestApi
	readonly geoTrackingApiKeySecretName: string
}

export class DispatchEngineOrchestrator extends Construct {
	constructor (scope: Construct, id: string, props: DispatchEngineOrchestratorProps) {
		super(scope, id)

		const {
			sameDayDeliveryProviderSettings,
			sameDayDirectPudoDeliveryJobs,
			sameDayDeliveryProviderOrdersStatusPartitionIndex,
			sameDayDeliveryProviderOrdersBatchIdIndex,
			sameDayDeliveryProviderOrders,
			eventBus,
			sameDayDeliveryProviderApi,
			sameDayDeliveryProviderApiSecretName,
			dispatchEngineLB,
			graphhopperLB,
			vpc,
			lambdaSecurityGroups,
			iotEndpointAddress,
			geoTrackingRestApi,
			geoTrackingApiKeySecretName,
		} = props

		const orchestratorHelper = new OrchestratorHelperLambda(this, 'OrchestratorHelperLambda', {
			dependencies: {
				sameDayDirectPudoDeliveryJobs,
				sameDayDeliveryProviderOrders,
				sameDayDeliveryProviderOrdersBatchIdIndex,
				eventBus,
				dispatchEngineLB,
				graphhopperLB,
				vpc,
				lambdaSecurityGroups,
				iotEndpointAddress,
				geoTrackingRestApi,
				geoTrackingApiKeySecretName,
			},
		})

		const dispatchEngineOrchestratorManager = new DispatchEngineOrchestratorManager(this, 'DispatchEngineOrchestratorManager', {
			orchestratorHelper,
			orderDispatchTimeoutInMinutes: sameDayDeliveryProviderSettings.orderDispatchTimeoutInMinutes as number,
		})

		const orderIngestValidatorLambda = new OrderIngestValidatorLambda(this, 'OrderIngestValidatorLambda', {
			dependencies: {
				dispatchEngineOrchestratorManager: dispatchEngineOrchestratorManager.stepFunction,
				sameDayDeliveryProviderOrders,
				sameDayDeliveryProviderOrdersStatusPartitionIndex,
				sameDayDeliveryProviderSettings,
				sameDayDeliveryProviderApi,
				sameDayDeliveryProviderApiSecretName,
			},
		})

		const batchDeadLetterQueue = new sqs.Queue(this, 'SameDayDeliveryBatchIgestionIntervalDeadLetter', {
			queueName: namespaced(this, 'same-day-delviery-provider-ingestion-interval-dead-letter'),
		})
		new events.Rule(this, 'SameDayDeliveryBatchIgestionInterval', {
			ruleName: namespaced(this, 'same-day-delviery-provider-ingestion-interval'),
			description: 'Used to trigger the lambda function that would eventually run the step function to call the dispatcher (if the timeout/max record item are reached)',
			targets: [
				new events_targets.LambdaFunction(orderIngestValidatorLambda, {
					retryAttempts: sameDayDeliveryProviderSettings.orderIngestRetryAttempts as number,
					deadLetterQueue: batchDeadLetterQueue,
				}),
			],
			schedule: events.Schedule.cron({ minute: `*/${sameDayDeliveryProviderSettings.orderIngestionValidatorIntervalInMinutes}` }),
		})
	}
}
