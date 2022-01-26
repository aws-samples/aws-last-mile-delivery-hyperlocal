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
import { Construct, Stack, StackProps } from '@aws-cdk/core'
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from '@aws-cdk/custom-resources'
import { namespaced, setNamespace } from '@aws-play/cdk-core'
import { PersistentBackendStack } from '../PersistentBackendStack'
import { SimulatorManagerStack, IoTPolicyStack, IoTRuleStack } from '@prototype/simulator'
import { SharedLayer } from '@prototype/lambda-common'
import { RestApi } from '@aws-play/cdk-apigateway'
import { Cors } from '@aws-cdk/aws-apigateway'
import * as s3 from '@aws-cdk/aws-s3'
import { WebsiteHostingStack } from '../../nested/WebsiteHostingStack'
import { SimulatorPersistentStack } from '../SimulatorPersistentStack'
import { BackendStack } from '../BackendStack'

export interface Env {
	readonly mapBoxToken: string
	readonly restaurantUserPassword: string
	readonly customerUserPassword: string
}

export interface SimulatorMainStackProps extends StackProps {
	readonly namespace: string
	readonly persistent: PersistentBackendStack
	readonly backend: BackendStack
	readonly simulatorPersistent: SimulatorPersistentStack
	readonly simulatorConfig: { [key: string]: string | number, }
}

export class SimulatorMainStack extends Stack {
	constructor (scope: Construct, id: string, props: SimulatorMainStackProps) {
		super(scope, id, props)

		const {
			namespace,
			persistent: {
				vpcPersistent: {
					vpc,
				},
				identityStackPersistent: {
					userPool,
					webAppClientId,
					simulatorAppClient,
					identityPool,
				},
				dataStoragePersistent: {
					geoPolygonTable,
					orderTable,
					dispatcherAssignmentsTable,
					internalProviderOrders,
				},
				backendBaseNestedStack: {
					vpcNetworking,
					liveDataCache: {
						redisCluster,
					},
				},
			},
			backend: {
				iotSetup: {
					iotDriverPolicy,
				},
				microService: {
					eventBus,
					geoTrackingRestApi,
					lambdaRefs,
					lambdaLayers,
				},
			},
			simulatorPersistent: {
				iotPolicies,
				ecsVpc,
				ecsContainerStack,
				dataStack,
				simulatorWebsiteBucket,
			},
			env,
			simulatorConfig,
		} = props

		setNamespace(this, namespace)

		const getIoTEndpoint = new AwsCustomResource(this, 'IoTEndpointSimulatorStack', {
			onCreate: {
				service: 'Iot',
				action: 'describeEndpoint',
				physicalResourceId: PhysicalResourceId.fromResponse('endpointAddress'),
				parameters: {
					endpointType: 'iot:Data-ATS',
				},
			},
			policy: AwsCustomResourcePolicy.fromSdkCalls({
				resources: AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
		})
		const iotEndpointAddress = getIoTEndpoint.getResponseField('endpointAddress')

		// create RestApi instance here, re-use everywhere else
		// also allow CORS
		const simulatorRestApi = new RestApi(this, 'SimulatorRestApi', {
			restApiName: namespaced(this, 'SimulatorRestApi'),
			defaultCorsPreflightOptions: {
				allowOrigins: Cors.ALL_ORIGINS,
				allowMethods: Cors.ALL_METHODS,
			},
		})

		const lambdaLayerRefs = {
			lambdaUtilsLayer: SharedLayer.of(this, 'LambdaUtilsLayer'),
			redisClientLayer: SharedLayer.of(this, 'RedisClientLayer'),
			esClientLayer: SharedLayer.of(this, 'ESClientLayer'),
			lambdaInsightsLayer: lambdaLayers.lambdaInsightsLayer,
		}

		const manager = new SimulatorManagerStack(this, 'SimulatorManager', {
			vpc: ecsVpc.vpc,
			securityGroup: ecsVpc.securityGroup,
			cluster: ecsContainerStack.cluster,

			driverSimulatorContainer: ecsContainerStack.driverSimulator,
			customerSimulatorContainer: ecsContainerStack.customerSimulator,
			restaurantSimulatorContainer: ecsContainerStack.restaurantSimulator,

			restaurantTable: dataStack.restaurantTable,
			restaurantAreaIndex: dataStack.restaurantAreaIndex,
			restaurantExecutionIdIndex: dataStack.restaurantExecutionIdIndex,
			restaurantSimulationsTable: dataStack.restaurantSimulationsTable,
			restaurantStatsTable: dataStack.restaurantStatsTable,

			customerTable: dataStack.customerTable,
			customerAreaIndex: dataStack.customerAreaIndex,
			customerExecutionIdIndex: dataStack.customerExecutionIdIndex,
			customerSimulationsTable: dataStack.customerSimulationsTable,
			customerStatsTable: dataStack.customerStatsTable,

			simulatorTable: dataStack.simulatorTable,
			eventTable: dataStack.eventTable,
			eventCreatedAtIndex: dataStack.eventCreatedAtIndex,
			geoPolygonTable,
			simulatorRestApi,
			userPool,
			eventBus,
			lambdaRefs,
			identityPool,
			userPoolClient: simulatorAppClient,
			iotDriverPolicy,
			iotCustomerPolicy: iotPolicies.iotCustomerPolicy,
			iotRestaurantPolicy: iotPolicies.iotRestaurantPolicy,
			simulatorConfig,
			restaurantUserPassword: (env as Env).restaurantUserPassword,
			customerUserPassword: (env as Env).customerUserPassword,

			lambdaLayers: lambdaLayerRefs,
			privateVpc: vpc,
			redisCluster,
			vpcNetworking,

			orderTable,
			dispatcherAssignmentsTable,
			internalProviderOrdersTable: internalProviderOrders,

			iotEndpointAddress,
		})

		const iotRules = new IoTRuleStack(this, 'IoTSimulatorRule', {
			customerStatusUpdateLambda: manager.customerSimulator.customerStatusUpdateLambda,
			restaurantStatusUpdateLambda: manager.restaurantSimulator.restaurantStatusUpdateLambda,
			customerStatusUpdateRuleName: iotPolicies.customerStatusUpdateRuleName,
			restaurantStatusUpdateRuleName: iotPolicies.restaurantStatusUpdateRuleName,
		})

		// simulatorWeb hosting
		const websiteBucketRef = s3.Bucket.fromBucketArn(this, 'SimulatorWebsiteBucket', simulatorWebsiteBucket.bucketArn)

		const appVars = {
			SEARCH_API_URL: geoTrackingRestApi.url,
			SIMULATOR_API_URL: simulatorRestApi.url,
			REGION: this.region,
			USERPOOL_ID: userPool.userPoolId,
			USERPOOL_CLIENT_ID: webAppClientId,
			MAP_BOX_TOKEN: (env as Env).mapBoxToken,
		}

		const websiteHostingNestedStack = new WebsiteHostingStack(this, 'SimulatorWebsiteHosting', {
			hostingBucket: websiteBucketRef,
			appVars,
		})

		/// to fix circular dependency: this updates the configuration of the lambda function utilised
		/// to startup the ECS task to include the SIMULATOR_API which is used to submit orders
		const resourceParams = {
			service: 'Lambda',
			action: 'updateFunctionConfiguration',
			parameters: {
				FunctionName: manager.customerSimulator.starter.lambda.functionArn,
				Environment: {
					Variables: {
						/// needed to avoid that env will get fully replaced with only the additional one
						...manager.customerSimulator.starter.environmentVariables,
						SIMULATOR_API: simulatorRestApi.url,
					},
				},
			},
			physicalResourceId: PhysicalResourceId.fromResponse('FunctionName'),
		}
		// temporary fix with Date.now() to force resource redeployment
		new AwsCustomResource(this, `UpdateLambdaConfiguration-${Date.now().toString(36)}`, {
			onCreate: resourceParams,
			onUpdate: resourceParams,
			policy: AwsCustomResourcePolicy.fromSdkCalls({
				resources: AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
		})
	}
}
