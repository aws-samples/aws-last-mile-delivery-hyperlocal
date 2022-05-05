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
import { Stack, StackProps, custom_resources as cr, aws_apigateway as apigw, aws_s3 as s3 } from 'aws-cdk-lib'
import { namespaced, setNamespace } from '@aws-play/cdk-core'
import { PersistentBackendStack } from '../PersistentBackendStack'
import { SimulatorManagerStack, IoTPolicyStack, IoTRuleStack } from '@prototype/simulator'
import { CENTROID, BASE_LOCATION, COUNTRIES, AREAS, DefaultWaf } from '@prototype/common'
import { SharedLayer } from '@prototype/lambda-common'
import { RestApi } from '@aws-play/cdk-apigateway'
import { WebsiteHostingStack } from '../../nested/WebsiteHostingStack'
import { SimulatorPersistentStack } from '../SimulatorPersistentStack'
import { BackendStack } from '../BackendStack'

export interface Env {
	readonly mapBoxToken: string
	readonly originUserPassword: string
	readonly destinationUserPassword: string
}

export interface SimulatorMainStackProps extends StackProps {
	readonly namespace: string
	readonly persistent: PersistentBackendStack
	readonly backend: BackendStack
	readonly simulatorPersistent: SimulatorPersistentStack
	readonly simulatorConfig: { [key: string]: string | number, }
	readonly country: string
}

const getCentroidArea = (country: string, area: string): string => {
	switch (country) {
		case COUNTRIES.PHILIPPINES:
			return (CENTROID.PHILIPPINES.MANILA as any)[area]
		case COUNTRIES.INDONESIA:
		default:
			return (CENTROID.INDONESIA.JAKARTA as any)[area]
	}
}

const getBaseLocation = (country: string): { lat: number, long: number, } | undefined => {
	switch (country) {
		case COUNTRIES.PHILIPPINES:
			return BASE_LOCATION.PHILIPPINES.MANILA
		case COUNTRIES.INDONESIA:
		default:
			return BASE_LOCATION.INDONESIA.JAKARTA
	}
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
					instantDeliveryProviderOrders,
					sameDayDirectPudoDeliveryJobs,
					sameDayDirectPudoSolverJobs,
					sameDayDirectPudoHubs,
					sameDayDirectPudoDeliveryJobsSolverJobIdIndexName,
				},
				backendBaseNestedStack: {
					vpcNetworking,
					liveDataCache: {
						memoryDBCluster,
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
			country,
		} = props

		setNamespace(this, namespace)

		const getIoTEndpoint = new cr.AwsCustomResource(this, 'IoTEndpointSimulatorStack', {
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

		// create RestApi instance here, re-use everywhere else
		// also allow CORS
		const simulatorRestApi = new RestApi(this, 'SimulatorRestApi', {
			restApiName: namespaced(this, 'SimulatorRestApi'),
			defaultCorsPreflightOptions: {
				allowOrigins: apigw.Cors.ALL_ORIGINS,
				allowMethods: apigw.Cors.ALL_METHODS,
			},
		})
		new DefaultWaf(this, 'SimulatorRestApiWaf', {
			resourceArn: simulatorRestApi.deploymentStage.stageArn,
		})

		const lambdaLayerRefs = {
			lambdaUtilsLayer: SharedLayer.of(this, 'LambdaUtilsLayer'),
			redisClientLayer: SharedLayer.of(this, 'RedisClientLayer'),
			openSearchClientLayer: SharedLayer.of(this, 'OpenSearchClientLayer'),
			lambdaInsightsLayer: lambdaLayers.lambdaInsightsLayer,
		}

		const manager = new SimulatorManagerStack(this, 'SimulatorManager', {
			vpc: ecsVpc.vpc,
			securityGroup: ecsVpc.securityGroup,
			cluster: ecsContainerStack.cluster,

			driverSimulatorContainer: ecsContainerStack.driverSimulator,
			originSimulatorContainer: ecsContainerStack.originSimulator,
			destinationSimulatorContainer: ecsContainerStack.destinationSimulator,

			originTable: dataStack.originTable,
			originAreaIndex: dataStack.originAreaIndex,
			originExecutionIdIndex: dataStack.originExecutionIdIndex,
			originSimulationsTable: dataStack.originSimulationsTable,
			originStatsTable: dataStack.originStatsTable,

			destinationTable: dataStack.destinationTable,
			destinationAreaIndex: dataStack.destinationAreaIndex,
			destinationExecutionIdIndex: dataStack.destinationExecutionIdIndex,
			destinationSimulationsTable: dataStack.destinationSimulationsTable,
			destinationStatsTable: dataStack.destinationStatsTable,

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
			iotDestinationPolicy: iotPolicies.iotDestinationPolicy,
			iotOriginPolicy: iotPolicies.iotOriginPolicy,
			simulatorConfig,
			originUserPassword: (env as Env).originUserPassword,
			destinationUserPassword: (env as Env).destinationUserPassword,

			lambdaLayers: lambdaLayerRefs,
			privateVpc: vpc,
			memoryDBCluster,
			vpcNetworking,

			orderTable,
			dispatcherAssignmentsTable,
			instantDeliveryProviderOrdersTable: instantDeliveryProviderOrders,
			sameDayDirectPudoDeliveryJobsTable: sameDayDirectPudoDeliveryJobs,
			sameDayDirectPudoSolverJobsTable: sameDayDirectPudoSolverJobs,
			sameDayDirectPudoHubsTable: sameDayDirectPudoHubs,
			sameDayDirectPudoDeliveryJobsSolverJobIdIndexName,

			iotEndpointAddress,
			simulatorConfigBucket: dataStack.simulatorConfigBucket,
			country,
		})

		const iotRules = new IoTRuleStack(this, 'IoTSimulatorRule', {
			destinationStatusUpdateLambda: manager.destinationSimulator.destinationStatusUpdateLambda,
			destinationStatusUpdateRuleName: iotPolicies.destinationStatusUpdateRuleName,
			originStatusUpdateLambda: manager.originSimulator.originStatusUpdateLambda,
			originStatusUpdateRuleName: iotPolicies.originStatusUpdateRuleName,
		})

		// simulatorWeb hosting
		const websiteBucketRef = s3.Bucket.fromBucketArn(this, 'SimulatorWebsiteBucket', simulatorWebsiteBucket.bucketArn)

		const supportedCountry = country.toUpperCase()
		const appVars = {
			SEARCH_API_URL: geoTrackingRestApi.url,
			SIMULATOR_API_URL: simulatorRestApi.url,
			REGION: this.region,
			USERPOOL_ID: userPool.userPoolId,
			USERPOOL_CLIENT_ID: webAppClientId,
			MAP_BOX_TOKEN: (env as Env).mapBoxToken,
			DEFAULT_AREAS: [
				getCentroidArea(supportedCountry, AREAS.AREA1),
				getCentroidArea(supportedCountry, AREAS.AREA2),
				getCentroidArea(supportedCountry, AREAS.AREA3),
			],
			BASE_LOCATION: getBaseLocation(supportedCountry),
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
				FunctionName: manager.destinationSimulator.starter.lambda.functionArn,
				Environment: {
					Variables: {
						/// needed to avoid that env will get fully replaced with only the additional one
						...manager.destinationSimulator.starter.environmentVariables,
						SIMULATOR_API: simulatorRestApi.url,
					},
				},
			},
			physicalResourceId: cr.PhysicalResourceId.fromResponse('FunctionName'),
		}
		// temporary fix with Date.now() to force resource redeployment
		new cr.AwsCustomResource(this, `UpdateLambdaConfiguration-${Date.now().toString(36)}`, {
			onCreate: resourceParams,
			onUpdate: resourceParams,
			policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
				resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
		})
	}
}
