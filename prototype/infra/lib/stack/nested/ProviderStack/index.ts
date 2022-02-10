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
import { NestedStack, NestedStackProps, aws_lambda as lambda, aws_events as events, aws_ecs as ecs, aws_dynamodb as ddb, aws_elasticloadbalancingv2 as elb, aws_elasticache as elasticache, aws_ec2 as ec2 } from 'aws-cdk-lib'
import { Networking } from '@prototype/networking'
import { ExamplePollingProvider, ExampleWebhookProvider, InstantDeliveryProvider } from '@prototype/provider-impl'
import { DispatchEngineOrchestrator, DriverEventHandler } from '@prototype/instant-delivery-provider'
import { GraphhopperSetup } from '@prototype/dispatch-setup'
import { ExternalProviderType } from '../../root/ExternalProviderStack'

export interface ProviderStackProps extends NestedStackProps {
	readonly vpc: ec2.IVpc
	readonly vpcNetworking: Networking
	readonly eventBus: events.IEventBus
	readonly instantDeliveryProviderOrders: ddb.ITable
	readonly instantDeliveryProviderLocks: ddb.ITable
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }
	readonly redisCluster: elasticache.CfnCacheCluster
	readonly pollingProviderSettings: { [key: string]: string | number, }
	readonly webhookProviderSettings: { [key: string]: string | number, }
	readonly instantDeliveryProviderSettings: { [key: string]: string | number | boolean, }
	readonly providersConfig: { [key: string]: any, }
	readonly externalProviderConfig: {
		MockPollingProvider: ExternalProviderType
		MockWebhookProvider: ExternalProviderType
	}
	readonly instantDeliveryProviderOrdersStatusIndex: string
	readonly dispatchEngineLB: elb.IApplicationLoadBalancer
	readonly backendEcsCluster: ecs.ICluster
	readonly graphhopperDockerRepoName: string
	readonly iotEndpointAddress: string
}

export class ProviderStack extends NestedStack {
	public readonly examplePollingProvider: ExamplePollingProvider

	public readonly exampleWebhookProvider: ExampleWebhookProvider

	public readonly instantDeliveryWebhookProvider: InstantDeliveryProvider

	constructor (scope: Construct, id: string, props: ProviderStackProps) {
		super(scope, id, props)

		const {
			vpc,
			vpcNetworking: {
				securityGroups,
			},
			eventBus,
			lambdaLayers,
			pollingProviderSettings,
			webhookProviderSettings,
			externalProviderConfig,
			instantDeliveryProviderSettings,
			redisCluster,
			instantDeliveryProviderLocks,
			instantDeliveryProviderOrders,
			instantDeliveryProviderOrdersStatusIndex,
			providersConfig,
			dispatchEngineLB,
			backendEcsCluster,
			graphhopperDockerRepoName,
			iotEndpointAddress,
		} = props

		const _layers: { [key: string]: lambda.ILayerVersion, } = {}
		for (const key in lambdaLayers) {
			if (Object.prototype.hasOwnProperty.call(lambdaLayers, key)) {
				const layer = lambdaLayers[key]
				_layers[key] = lambda.LayerVersion.fromLayerVersionArn(this, `Layer-${key}`, layer.layerVersionArn)
			}
		}

		const baseParams = {
			vpc,
			lambdaSecurityGroups: [securityGroups.lambda],
			layers: _layers,
			eventBus: events.EventBus.fromEventBusArn(this, 'EventBus', eventBus.eventBusArn),
		}

		this.examplePollingProvider = new ExamplePollingProvider(this, 'ExamplePollingProvider', {
			pollingProviderSettings,
			externalProviderMockUrl: externalProviderConfig.MockPollingProvider.url,
			externalProviderSecretName: externalProviderConfig.MockPollingProvider.apiKeySecretName,
			redisCluster,
			...baseParams,
		})

		this.exampleWebhookProvider = new ExampleWebhookProvider(this, 'ExampleWebhookProvider', {
			webhookProviderSettings,
			externalProviderMockUrl: externalProviderConfig.MockWebhookProvider.url,
			externalProviderSecretName: externalProviderConfig.MockWebhookProvider.apiKeySecretName,
			redisCluster,
			...baseParams,
		})

		this.instantDeliveryWebhookProvider = new InstantDeliveryProvider(this, 'InstantDeliveryProvider', {
			instantDeliveryProviderSettings,
			instantDeliveryProviderOrders,
			...baseParams,
		})

		const graphhopperSetup = new GraphhopperSetup(this, 'GraphhopperSetup', {
			vpc,
			dmzSecurityGroup: securityGroups.dmz,
			ecsCluster: backendEcsCluster,
			dockerRepoName: graphhopperDockerRepoName,
		})

		const graphhopperLB = graphhopperSetup.loadBalancer

		new DispatchEngineOrchestrator(this, 'DispatchEngineOrchestrator', {
			instantDeliveryProviderApi: this.instantDeliveryWebhookProvider.apiGwInstance,
			instandDeliveryProviderApiSecretName: providersConfig.InstantDeliveryProvider.apiKeySecretName,
			orderBatchStream: this.instantDeliveryWebhookProvider.orderBatchStream,
			instantDeliveryProviderSettings,
			instantDeliveryProviderOrders,
			instantDeliveryProviderLocks,
			eventBus,
			dispatchEngineLB,
			graphhopperLB,
			vpc,
			lambdaSecurityGroups: [securityGroups.lambda],
			iotEndpointAddress,
		})

		new DriverEventHandler(this, 'DriverEventHandler', {
			orderBatchStream: this.instantDeliveryWebhookProvider.orderBatchStream,
			instantDeliveryProviderApi: this.instantDeliveryWebhookProvider.apiGwInstance,
			instandDeliveryProviderApiSecretName: providersConfig.InstantDeliveryProvider.apiKeySecretName,
			instantDeliveryProviderOrdersStatusIndex,
			instantDeliveryProviderSettings,
			instantDeliveryProviderOrders,
			instantDeliveryProviderLocks,
			eventBus,
			iotEndpointAddress,
		})
	}
}
