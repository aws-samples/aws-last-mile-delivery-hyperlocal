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
import { NestedStack, NestedStackProps, aws_lambda as lambda, aws_events as events, aws_ecs as ecs, aws_dynamodb as ddb, aws_elasticloadbalancingv2 as elb, aws_ec2 as ec2, aws_ssm as ssm } from 'aws-cdk-lib'
import { Networking } from '@prototype/networking'
import { RestApi } from '@aws-play/cdk-apigateway'
import { ExamplePollingProvider, ExampleWebhookProvider, InstantDeliveryProvider, SameDayDeliveryProvider } from '@prototype/provider-impl'
import { GraphhopperSetup } from '@prototype/dispatch-setup'
import { MemoryDBCluster } from '@prototype/live-data-cache'
import { ExternalProviderEntry } from '../../root/ExternalProviderStack'
import * as instantDelivery from '@prototype/instant-delivery-provider'
import * as sameDayDelivery from '@prototype/same-day-delivery-provider'
import { PollingProviderBase, WebhookProviderBase } from '@prototype/provider'

export interface ProviderStackProps extends NestedStackProps {
	readonly vpc: ec2.IVpc
	readonly vpcNetworking: Networking
	readonly eventBus: events.IEventBus
	readonly instantDeliveryProviderOrders: ddb.ITable
	readonly instantDeliveryProviderLocks: ddb.ITable
	readonly sameDayDeliveryProviderOrders: ddb.ITable
	readonly sameDayDeliveryProviderLocks: ddb.ITable
	readonly sameDayDirectPudoDeliveryJobs: ddb.ITable
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }
	readonly memoryDBCluster: MemoryDBCluster
	readonly pollingProviderSettings: { [key: string]: string | number, }
	readonly webhookProviderSettings: { [key: string]: string | number, }
	readonly instantDeliveryProviderSettings: { [key: string]: string | number | boolean, }
	readonly sameDayDeliveryProviderSettings: { [key: string]: string | number | boolean, }
	readonly providersConfig: { [key: string]: any, }
	readonly externalProviderConfig: Record<string, ExternalProviderEntry>
	readonly instantDeliveryProviderOrdersStatusIndex: string
	readonly instantDeliveryProviderOrdersJobIdIndex: string
	readonly sameDayDeliveryProviderOrdersStatusIndex: string
	readonly sameDayDeliveryProviderOrdersJobIdIndex: string
	readonly sameDayDeliveryProviderOrdersBatchIdIndex: string
	readonly sameDayDeliveryProviderOrdersStatusPartitionIndex: string
	readonly instantDeliveryDispatchEngineLB: elb.IApplicationLoadBalancer
	readonly sameDayDeliveryDispatcherLB: elb.IApplicationLoadBalancer
	readonly backendEcsCluster: ecs.ICluster
	readonly graphhopperSettings: Record<string, string | number>
	readonly iotEndpointAddress: string
	readonly geoTrackingRestApi: RestApi
	readonly geoTrackingApiKeySecretName: string
}

export class ProviderStack extends NestedStack {
	public readonly pollingProviders: Record<string, PollingProviderBase>

	public readonly webhookProviders: Record<string, WebhookProviderBase>

	public readonly instantDeliveryWebhookProvider: InstantDeliveryProvider

	public readonly sameDayDeliveryWebhookProvider: SameDayDeliveryProvider

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
			sameDayDeliveryProviderSettings,
			memoryDBCluster,
			instantDeliveryProviderOrders,
			instantDeliveryProviderLocks,
			instantDeliveryProviderOrdersStatusIndex,
			instantDeliveryProviderOrdersJobIdIndex,
			sameDayDeliveryProviderOrders,
			sameDayDeliveryProviderLocks,
			sameDayDeliveryProviderOrdersStatusIndex,
			sameDayDeliveryProviderOrdersJobIdIndex,
			sameDayDeliveryProviderOrdersBatchIdIndex,
			sameDayDeliveryProviderOrdersStatusPartitionIndex,
			sameDayDirectPudoDeliveryJobs,
			providersConfig,
			instantDeliveryDispatchEngineLB,
			sameDayDeliveryDispatcherLB,
			backendEcsCluster,
			graphhopperSettings,
			iotEndpointAddress,
			geoTrackingRestApi,
			geoTrackingApiKeySecretName,
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

		this.pollingProviders = {}
		this.webhookProviders = {}

		const mockPollingProviderApiUrlSSMParam = ssm.StringParameter.fromStringParameterName(
			this,
			'mockPollingProviderApiUrlSSMParam',
			externalProviderConfig.MockPollingProvider.apiUrlParameterStoreKey,
		)
		const examplePollingProvider = new ExamplePollingProvider(this, 'ExamplePollingProvider', {
			pollingProviderSettings,
			externalProviderMockUrl: mockPollingProviderApiUrlSSMParam.stringValue,
			externalProviderSecretName: externalProviderConfig.MockPollingProvider.apiKeySecretName,
			memoryDBCluster,
			...baseParams,
		})
		this.pollingProviders.ExamplePollingProvider = examplePollingProvider

		const mockWebhookProviderApiUrlSSMParam = ssm.StringParameter.fromStringParameterName(
			this,
			'mockWebhookProviderApiUrlSSMParam',
			externalProviderConfig.MockWebhookProvider.apiUrlParameterStoreKey,
		)
		const exampleWebhookProvider = new ExampleWebhookProvider(this, 'ExampleWebhookProvider', {
			webhookProviderSettings,
			externalProviderMockUrl: mockWebhookProviderApiUrlSSMParam.stringValue,
			externalProviderSecretName: externalProviderConfig.MockWebhookProvider.apiKeySecretName,
			memoryDBCluster,
			...baseParams,
		})
		this.webhookProviders.ExampleWebhookProvider = exampleWebhookProvider

		this.instantDeliveryWebhookProvider = new InstantDeliveryProvider(this, 'InstantDeliveryProvider', {
			instantDeliveryProviderSettings,
			instantDeliveryProviderOrders,
			...baseParams,
		})

		this.sameDayDeliveryWebhookProvider = new SameDayDeliveryProvider(this, 'SameDayDeliveryProvider', {
			sameDayDeliveryProviderSettings,
			sameDayDeliveryProviderOrders,
			...baseParams,
		})

		const graphhopperSetup = new GraphhopperSetup(this, 'GraphhopperSetup', {
			vpc,
			dmzSecurityGroup: securityGroups.dmz,
			ecsCluster: backendEcsCluster,
			osmPbfMapFileUrl: graphhopperSettings.osmPbfMapFileUrl.toString(),
			javaOpts: graphhopperSettings.javaOpts ? graphhopperSettings.javaOpts.toString() : undefined,
			containerName: graphhopperSettings.containerName.toString(),
			ecsTaskCount: graphhopperSettings.ecsTaskCount as number,
		})

		const graphhopperLB = graphhopperSetup.loadBalancer

		new instantDelivery.DispatchEngineOrchestrator(this, 'InstantDeliveryDispatchEngineOrchestrator', {
			instantDeliveryProviderApi: this.instantDeliveryWebhookProvider.apiGwInstance,
			instantDeliveryProviderApiSecretName: providersConfig.InstantDeliveryProvider.apiKeySecretName,
			orderBatchStream: this.instantDeliveryWebhookProvider.orderBatchStream,
			instantDeliveryProviderSettings,
			instantDeliveryProviderOrders,
			instantDeliveryProviderLocks,
			eventBus,
			instantDeliveryDispatchEngineLB,
			graphhopperLB,
			vpc,
			lambdaSecurityGroups: [securityGroups.lambda],
			iotEndpointAddress,
		})

		new instantDelivery.DriverEventHandler(this, 'InstantDelvieryDriverEventHandler', {
			orderBatchStream: this.instantDeliveryWebhookProvider.orderBatchStream,
			instantDeliveryProviderApi: this.instantDeliveryWebhookProvider.apiGwInstance,
			instantDeliveryProviderApiSecretName: providersConfig.InstantDeliveryProvider.apiKeySecretName,
			instantDeliveryProviderOrdersStatusIndex,
			instantDeliveryProviderOrdersJobIdIndex,
			instantDeliveryProviderSettings,
			instantDeliveryProviderOrders,
			instantDeliveryProviderLocks,
			eventBus,
			iotEndpointAddress,
		})

		new sameDayDelivery.DispatchEngineOrchestrator(this, 'SameDayDeliveryDispatchEngineOrchestrator', {
			sameDayDeliveryProviderApi: this.sameDayDeliveryWebhookProvider.apiGwInstance,
			sameDayDeliveryProviderApiSecretName: providersConfig.SameDayDeliveryProvider.apiKeySecretName,
			sameDayDeliveryProviderSettings,
			sameDayDeliveryProviderOrders,
			sameDayDeliveryProviderOrdersStatusPartitionIndex,
			sameDayDirectPudoDeliveryJobs,
			sameDayDeliveryProviderOrdersBatchIdIndex,
			eventBus,
			dispatchEngineLB: sameDayDeliveryDispatcherLB,
			graphhopperLB,
			vpc,
			lambdaSecurityGroups: [securityGroups.lambda],
			iotEndpointAddress,
			geoTrackingRestApi,
			geoTrackingApiKeySecretName,
		})

		new sameDayDelivery.DriverEventHandler(this, 'SameDayDriverEventHandler', {
			sameDayDeliveryProviderApi: this.sameDayDeliveryWebhookProvider.apiGwInstance,
			sameDayDeliveryProviderApiSecretName: providersConfig.SameDayDeliveryProvider.apiKeySecretName,
			sameDayDeliveryProviderOrdersStatusIndex,
			sameDayDeliveryProviderOrdersJobIdIndex,
			sameDayDeliveryProviderSettings,
			sameDayDeliveryProviderOrders,
			sameDayDeliveryProviderLocks,
			eventBus,
			iotEndpointAddress,
		})
	}
}
