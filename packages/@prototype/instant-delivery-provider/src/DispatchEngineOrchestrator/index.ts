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
	readonly instantDeliveryProviderOrders: ddb.ITable
	readonly instantDeliveryProviderLocks: ddb.ITable
	readonly orderBatchStream: kinesis.IStream
	readonly eventBus: events.IEventBus
	readonly instantDeliveryProviderApi: RestApi
	readonly iotEndpointAddress: string
	readonly instantDeliveryProviderApiSecretName: string
	readonly instantDeliveryProviderSettings: { [key: string]: string | number | boolean, }
	readonly instantDeliveryDispatchEngineLB: elb.IApplicationLoadBalancer
	readonly graphhopperLB: elb.IApplicationLoadBalancer
	readonly vpc: ec2.IVpc
	readonly lambdaSecurityGroups: ec2.ISecurityGroup[]
}

export class DispatchEngineOrchestrator extends Construct {
	constructor (scope: Construct, id: string, props: DispatchEngineOrchestratorProps) {
		super(scope, id)

		const {
			instantDeliveryProviderSettings,
			instantDeliveryProviderOrders,
			instantDeliveryProviderLocks,
			orderBatchStream,
			eventBus,
			instantDeliveryProviderApi,
			instantDeliveryProviderApiSecretName,
			instantDeliveryDispatchEngineLB,
			graphhopperLB,
			vpc,
			lambdaSecurityGroups,
			iotEndpointAddress,
		} = props

		const orchestratorHelper = new OrchestratorHelperLambda(this, 'OrchestratorHelperLambda', {
			dependencies: {
				instantDeliveryProviderOrders,
				instantDeliveryProviderLocks,
				orderBatchStream,
				eventBus,
				instantDeliveryProviderSettings,
				instantDeliveryProviderApi,
				instantDeliveryProviderApiSecretName,
				instantDeliveryDispatchEngineLB,
				graphhopperLB,
				vpc,
				lambdaSecurityGroups,
				iotEndpointAddress,
			},
		})

		const dispatchEngineOrchestratorManager = new DispatchEngineOrchestratorManager(this, 'DispatchEngineOrchestratorManager', {
			orchestratorHelper,
			orderDispatchTimeoutInMinutes: instantDeliveryProviderSettings.orderDispatchTimeoutInMinutes as number,
		})

		const geoClusteringManager = new GeoClusteringManager(this, 'GeoClusteringManager', {
			orchestratorHelper,
			dispatchEngineStepFunction: dispatchEngineOrchestratorManager.stepFunction,
		})

		const orderIngestLambda = new OrderIngestLambda(this, 'OrderIngestLambda', {
			dependencies: {
				geoClusteringManager: geoClusteringManager.stepFunction,
				orderDataStream: orderBatchStream,
			},
		})

		new KinesisConsumer(this, 'OrderIngestKinesisConsumer', {
			baseName: 'instant-delivery-provider',
			lambdaFn: orderIngestLambda,
			kinesisStream: orderBatchStream,
			batchSize: instantDeliveryProviderSettings.orderIngestBatchSize as number,
			parallelizationFactor: instantDeliveryProviderSettings.orderIngestParallelizationFactor as number,
			retryAttempts: instantDeliveryProviderSettings.orderIngestRetryAttempts as number,
			useFanOutConsumer: instantDeliveryProviderSettings.orderIngestUseFanOutConsumer as boolean,
			maxBatchingWindowMs: instantDeliveryProviderSettings.orderIngestMaxBatchingWindowMs as number,
		})
	}
}
