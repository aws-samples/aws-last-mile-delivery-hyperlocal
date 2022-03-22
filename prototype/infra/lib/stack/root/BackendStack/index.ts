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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Construct } from 'constructs'
import { Stack, StackProps, custom_resources as cr, aws_ssm as ssm } from 'aws-cdk-lib'
import { setNamespace } from '@aws-play/cdk-core'
import { PersistentBackendStack } from '../PersistentBackendStack'
import { StreamingStack } from '../../nested/StreamingStack'
import { MicroServiceStack } from '../../nested/MicroServiceStack'
import { IotIngestionStack } from '../../nested/IotIngestionStack'
import { OrderOrchestrationStack } from '../../nested/OrderOrchestrationStack'
import { AppConfigNestedStack } from '@prototype/appconfig'
import { ProviderStack } from '../../nested/ProviderStack'
import { CustomResourcesStack } from '../../nested/CustomResourcesStack'
import { IoTStack } from '@prototype/iot-ingestion'
import { ExternalProviderType } from '../ExternalProviderStack'
import { DispatcherStack } from '../../nested/DispatcherStack'
import { sync as findUp } from 'find-up'
import * as path from 'path'

export interface BackendStackProps extends StackProps {
	readonly namespace: string
	readonly persistent: PersistentBackendStack
	readonly memoryDBConfig: { [key: string]: string | number, }
	readonly kinesisConfig: { [key: string]: string | number | boolean, }
	readonly deliveryAppConfig: { [key: string]: any, }
	readonly pollingProviderSettings: { [key: string]: string | number, }
	readonly webhookProviderSettings: { [key: string]: string | number, }
	readonly providersConfig: { [key: string]: any, }
	readonly externalProviderConfig: {
		MockPollingProvider: ExternalProviderType
		MockWebhookProvider: ExternalProviderType
	}
	readonly instantDeliveryProviderSettings: { [key: string]: string | number | boolean, }
	readonly orderManagerSettings: { [key: string]: string | number | boolean, }
	readonly geoTrackingApiKeySecretName: string
	readonly graphhopperSettings: Record<string, string | number>
	readonly dispatcherSettings: Record<string, string | number | any>
	readonly parameterStoreKeys: Record<string, string>
}

/**
 * Prototype backend stack
 */
export class BackendStack extends Stack {
	public readonly iotSetup: IoTStack

	public readonly microService: MicroServiceStack

	public readonly appConfig: AppConfigNestedStack

	constructor (scope: Construct, id: string, props: BackendStackProps) {
		super(scope, id, props)

		const {
			namespace,
			persistent: {
				vpcPersistent: {
					vpc,
				},
				identityStackPersistent: {
					userPool,
					authenticatedRole: externalIdentityAuthenticatedRole,
				},
				internalIdentityStack: {
					userPoolDomain: internalUserPoolDomain,
				},
				dataStoragePersistent: {
					driversTelemetryBucket,
					dispatchEngineBucket,
					geoPolygonTable,
					orderTable,
					demographicAreaDispatchSettings,
					dispatcherAssignmentsTable,
					demographicAreaProviderEngineSettings,
					instantDeliveryProviderLocks,
					instantDeliveryProviderOrders,
					instantDeliveryProviderOrdersStatusIndex,
					instantDeliveryProviderOrdersJobIdIndex,
					sameDayDirectPudoDeliveryJobs,
					sameDayDirectPudoSolverJobs,
					ssmStringParameters: dataStorageSsmStringParameters,
				},
				backendBaseNestedStack: {
					vpcNetworking,
					liveDataCache,
				},
				backendEcsCluster,
			},
			memoryDBConfig,
			kinesisConfig,
			deliveryAppConfig,
			pollingProviderSettings,
			webhookProviderSettings,
			instantDeliveryProviderSettings,
			providersConfig,
			externalProviderConfig,
			env,
			geoTrackingApiKeySecretName,
			parameterStoreKeys,
			orderManagerSettings,
			graphhopperSettings,
			dispatcherSettings,
		} = props

		setNamespace(this, namespace)

		const getIoTEndpoint = new cr.AwsCustomResource(this, 'IoTEndpointBackendStack', {
			onCreate: {
				service: 'Iot',
				action: 'describeEndpoint',
				physicalResourceId: cr.PhysicalResourceId.fromResponse('endpointAddress'),
				parameters: {
					endpointType: 'iot:Data-ATS',
				},
			},
			policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
				resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
		})
		const iotEndpointAddress = getIoTEndpoint.getResponseField('endpointAddress')

		const streamingNestedStack = new StreamingStack(this, 'StreamingNestedStack', {
			driversTelemetryBucket,
			kinesisConfig,
		})

		const microServiceNestedStack = new MicroServiceStack(this, 'MicroServiceNestedStack', {
			geoPolygonTable,
			demographicAreaDispatchSettings,
			vpc,
			userPool,
			vpcNetworking,
			memoryDBCluster: liveDataCache.memoryDBCluster,
			openSearchDomain: liveDataCache.openSearchDomain,
			driverDataIngestStream: streamingNestedStack.kinesisDataStreams.driverDataIngestStream,
			memoryDBConfig,
			kinesisConfig,
			env,
			geoTrackingApiUrlParameterName: parameterStoreKeys.geoTrackingApiUrl,
		})
		this.microService = microServiceNestedStack

		const iotIngestionNestedStack = new IotIngestionStack(this, 'IotIngestionNestedStack', {
			externalIdentityAuthenticatedRole,
			driverDataIngestStream: streamingNestedStack.kinesisDataStreams.driverDataIngestStream,
			lambdaRefs: microServiceNestedStack.lambdaRefs,
		})
		this.iotSetup = iotIngestionNestedStack.iotSetup

		const appConfigNestedStack = new AppConfigNestedStack(this, 'AppConfigNestedStack', {
			cognitoAuthenticatedRole: externalIdentityAuthenticatedRole,
			deliveryAppConfig,
			iotEndpointAddress,
		})
		this.appConfig = appConfigNestedStack

		// merge ssmStringParameters to one
		const ssmStringParameters: Record<string, ssm.IStringParameter> = {
			...dataStorageSsmStringParameters,
			...microServiceNestedStack.ssmStringParameters,
		}

		const dispatcherStack = new DispatcherStack(this, 'DispatcherStack', {
			demAreaDispatchEngineSettingsTable: demographicAreaDispatchSettings,
			dispatchEngineBucket,
			dispatcherAssignmentsTable,
			dispatcherSettings,
			driverApiKeySecretName: geoTrackingApiKeySecretName,
			osmPbfMapFileUrl: graphhopperSettings.osmPbfMapFileUrl as string,
			parameterStoreKeys,
			sameDayDirectPudoDeliveryJobs,
			sameDayDirectPudoSolverJobs,
			ssmStringParameters,
			vpc,
			vpcNetworking,
		})

		const providerNestedStack = new ProviderStack(this, 'ProvidersNestedStack', {
			vpc,
			vpcNetworking,
			eventBus: microServiceNestedStack.eventBus,
			lambdaLayers: microServiceNestedStack.lambdaLayers,
			memoryDBCluster: liveDataCache.memoryDBCluster,
			instantDeliveryProviderOrders,
			instantDeliveryProviderOrdersStatusIndex,
			instantDeliveryProviderOrdersJobIdIndex,
			pollingProviderSettings,
			webhookProviderSettings,
			externalProviderConfig,
			instantDeliveryProviderSettings,
			instantDeliveryProviderLocks,
			dispatchEngineLB: dispatcherStack.dispatcherLB,
			providersConfig,
			backendEcsCluster,
			graphhopperSettings,
			iotEndpointAddress,
		})

		const orderOrchestrationStack = new OrderOrchestrationStack(this, 'OrderOrchestrationStack', {
			orderTable,
			eventBus: microServiceNestedStack.eventBus,
			providersConfig,
			demographicAreaProviderEngineSettings,
			vpc,
			vpcNetworking,
			lambdaLayers: microServiceNestedStack.lambdaLayers,
			memoryDBCluster: liveDataCache.memoryDBCluster,
			orderManagerSettings,
			providerApiUrls: {
				InstantDeliveryProvider: providerNestedStack.instantDeliveryWebhookProvider.apiGwInstance,
				ExampleWebhookProvider: providerNestedStack.exampleWebhookProvider.apiGwInstance,
				ExamplePollingProvider: providerNestedStack.examplePollingProvider.apiGwInstance,
			},
		})

		const customResourcesNestedStack = new CustomResourcesStack(this, 'CustomResourcesNestedStack', {
			vpc,
			vpcNetworking,
			lambdaRefs: microServiceNestedStack.lambdaRefs,
			providerNestedStack,
			providersConfig,

			additionalApiConfig: [
				{
					keyArn: microServiceNestedStack.geoTrackingRestApiKey.keyArn,
					keyId: microServiceNestedStack.geoTrackingRestApiKey.keyId,
					secret: geoTrackingApiKeySecretName,
				},
			],
		})
	}
}
