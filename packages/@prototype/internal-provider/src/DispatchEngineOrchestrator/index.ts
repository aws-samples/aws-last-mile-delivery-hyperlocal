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
import { aws_kinesis as kinesis, aws_dynamodb as ddb, aws_events as events, aws_elasticloadbalancingv2 as elb, aws_ec2 as ec2 } from 'aws-cdk-lib'
import { RestApi } from '@aws-play/cdk-apigateway'
import { KinesisConsumer } from '@prototype/lambda-common'
import { DispatchEngineOrchestratorManager } from './DispatchEngineOrchestrator'
import { GeoClusteringManager } from './GeoClusteringManager'
import { OrderIngestLambda } from './OrderIngestLambda'
import { OrchestratorHelperLambda } from './OrchestratorHelperLambda'

export interface DispatchEngineOrchestratorProps {
	readonly internalProviderOrders: ddb.ITable
	readonly internalProviderLocks: ddb.ITable
	readonly orderBatchStream: kinesis.IStream
	readonly eventBus: events.IEventBus
	readonly internalProviderApi: RestApi
	readonly iotEndpointAddress: string
	readonly internalProviderApiSecretName: string
	readonly internalWebhookProviderSettings: { [key: string]: string | number | boolean, }
	readonly dispatchEngineLB: elb.IApplicationLoadBalancer
	readonly graphhopperLB: elb.IApplicationLoadBalancer
	readonly vpc: ec2.IVpc
	readonly lambdaSecurityGroups: ec2.ISecurityGroup[]
}

export class DispatchEngineOrchestrator extends Construct {
	constructor (scope: Construct, id: string, props: DispatchEngineOrchestratorProps) {
		super(scope, id)

		const {
			internalWebhookProviderSettings,
			internalProviderOrders,
			internalProviderLocks,
			orderBatchStream,
			eventBus,
			internalProviderApi,
			internalProviderApiSecretName,
			dispatchEngineLB,
			graphhopperLB,
			vpc,
			lambdaSecurityGroups,
			iotEndpointAddress,
		} = props

		const ochestratorHelper = new OrchestratorHelperLambda(this, 'OrchestratorHelperLambda', {
			dependencies: {
				internalProviderOrders,
				internalProviderLocks,
				orderBatchStream,
				eventBus,
				internalWebhookProviderSettings,
				internalProviderApi,
				internalProviderApiSecretName,
				dispatchEngineLB,
				graphhopperLB,
				vpc,
				lambdaSecurityGroups,
				iotEndpointAddress,
			},
		})

		const dispatchEngineOrchestratorManager = new DispatchEngineOrchestratorManager(this, 'DispatchEngineOrchestratorManager', {
			ochestratorHelper,
		})

		const geoClusteringManager = new GeoClusteringManager(this, 'GeoClusteringManager', {
			ochestratorHelper,
			dispatchEngineStepFunction: dispatchEngineOrchestratorManager.stepFunction,
		})

		const orderIngestLambda = new OrderIngestLambda(this, 'OrderIngestLambda', {
			dependencies: {
				geoClusteringManager: geoClusteringManager.stepFunction,
				orderDataStream: orderBatchStream,
			},
		})

		new KinesisConsumer(this, 'OrderIngestKinesisConsumer', {
			baseName: 'internal-provider',
			lambdaFn: orderIngestLambda,
			kinesisStream: orderBatchStream,
			batchSize: internalWebhookProviderSettings.orderIngestBatchSize as number,
			parallelizationFactor: internalWebhookProviderSettings.orderIngestParallelizationFactor as number,
			retryAttempts: internalWebhookProviderSettings.orderIngestRetryAttempts as number,
			useFanOutConsumer: internalWebhookProviderSettings.orderIngestUseFanOutConsumer as boolean,
			maxBatchingWindowMs: internalWebhookProviderSettings.orderIngestMaxBatchingWindowMs as number,
		})
	}
}
