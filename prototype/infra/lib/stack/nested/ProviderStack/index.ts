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
import { Construct, NestedStack, NestedStackProps } from '@aws-cdk/core'
import { LayerVersion, ILayerVersion } from '@aws-cdk/aws-lambda'
import { EventBus, IEventBus } from '@aws-cdk/aws-events'
import { ICluster } from '@aws-cdk/aws-ecs'
import { ITable } from '@aws-cdk/aws-dynamodb'
import { IApplicationLoadBalancer } from '@aws-cdk/aws-elasticloadbalancingv2'
import { Networking } from '@prototype/networking'
import { CfnCacheCluster } from '@aws-cdk/aws-elasticache'
import { ExamplePollingProvider, ExampleWebhookProvider, InternalWebhookProvider } from '@prototype/provider-impl'
import { DispatchEngineOrchestrator, DriverEventHandler } from '@prototype/internal-provider'
import { GraphhopperSetup } from '@prototype/dispatch-setup'
import { IVpc } from '@aws-cdk/aws-ec2'
import { ExternalProviderType } from '../../root/ExternalProviderStack'

export interface ProviderStackProps extends NestedStackProps {
	readonly vpc: IVpc
	readonly vpcNetworking: Networking
	readonly eventBus: IEventBus
	readonly internalProviderOrders: ITable
	readonly internalProviderLocks: ITable
	readonly lambdaLayers: { [key: string]: ILayerVersion, }
	readonly redisCluster: CfnCacheCluster
	readonly pollingProviderSettings: { [key: string]: string | number, }
	readonly webhookProviderSettings: { [key: string]: string | number, }
	readonly internalWebhookProviderSettings: { [key: string]: string | number | boolean, }
	readonly providersConfig: { [key: string]: any, }
	readonly externalProviderConfig: {
		MockPollingProvider: ExternalProviderType
		MockWebhookProvider: ExternalProviderType
	}
	readonly internalProviderOrdersStatusIndex: string
	readonly dispatchEngineLB: IApplicationLoadBalancer
	readonly backendEcsCluster: ICluster
	readonly graphhopperDockerRepoName: string
	readonly iotEndpointAddress: string
}

export class ProviderStack extends NestedStack {
	public readonly examplePollingProvider: ExamplePollingProvider

	public readonly exampleWebhookProvider: ExampleWebhookProvider

	public readonly internalWebhookProvider: InternalWebhookProvider

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
			internalWebhookProviderSettings,
			redisCluster,
			internalProviderLocks,
			internalProviderOrders,
			internalProviderOrdersStatusIndex,
			providersConfig,
			dispatchEngineLB,
			backendEcsCluster,
			graphhopperDockerRepoName,
			iotEndpointAddress,
		} = props

		const _layers: { [key: string]: ILayerVersion, } = {}
		for (const key in lambdaLayers) {
			if (Object.prototype.hasOwnProperty.call(lambdaLayers, key)) {
				const layer = lambdaLayers[key]
				_layers[key] = LayerVersion.fromLayerVersionArn(this, `Layer-${key}`, layer.layerVersionArn)
			}
		}

		const baseParams = {
			vpc,
			lambdaSecurityGroups: [securityGroups.lambda],
			layers: _layers,
			eventBus: EventBus.fromEventBusArn(this, 'EventBus', eventBus.eventBusArn),
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

		this.internalWebhookProvider = new InternalWebhookProvider(this, 'InternalWebhookProvider', {
			internalWebhookProviderSettings,
			internalProviderOrders,
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
			internalProviderApi: this.internalWebhookProvider.apiGwInstance,
			internalProviderApiSecretName: providersConfig.InternalWebhookProvider.apiKeySecretName,
			orderBatchStream: this.internalWebhookProvider.orderBatchStream,
			internalWebhookProviderSettings,
			internalProviderOrders,
			internalProviderLocks,
			eventBus,
			dispatchEngineLB,
			graphhopperLB,
			vpc,
			lambdaSecurityGroups: [securityGroups.lambda],
			iotEndpointAddress,
		})

		new DriverEventHandler(this, 'DriverEventHandler', {
			orderBatchStream: this.internalWebhookProvider.orderBatchStream,
			internalProviderApi: this.internalWebhookProvider.apiGwInstance,
			internalProviderApiSecretName: providersConfig.InternalWebhookProvider.apiKeySecretName,
			internalProviderOrdersStatusIndex,
			internalWebhookProviderSettings,
			internalProviderOrders,
			internalProviderLocks,
			eventBus,
			iotEndpointAddress,
		})
	}
}
