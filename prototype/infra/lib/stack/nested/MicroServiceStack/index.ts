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
import { NestedStack, NestedStackProps, Environment, aws_apigateway as apigw, aws_lambda as lambda, aws_kinesis as kinesis, aws_dynamodb as ddb, aws_cognito as cognito, aws_events as events, aws_memorydb as memorydb, aws_opensearchservice as opensearchservice, aws_ec2 as ec2 } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { RestApi } from '@aws-play/cdk-apigateway'
import { LambdaUtilsLayer, OpenSearchClientLayer, RedisClientLayer, LambdaInsightsLayer } from '@prototype/lambda-common'
import { Networking } from '@prototype/networking'
import { ApiGeoTracking, ApiGeofencing } from '@prototype/api-geotracking'
import { LambdaFunctions } from '@prototype/lambda-functions'

export interface MicroServiceStackProps extends NestedStackProps {
	readonly vpc: ec2.IVpc
	readonly geoPolygonTable: ddb.ITable
	readonly demographicAreaDispatchSettings: ddb.ITable
	readonly userPool: cognito.IUserPool
	readonly vpcNetworking: Networking
	readonly memoryDBCluster: memorydb.CfnCluster
	readonly openSearchDomain: opensearchservice.IDomain
	readonly driverDataIngestStream: kinesis.IStream
	readonly memoryDBConfig: { [key: string]: string | number, }
	readonly kinesisConfig: { [key: string]: string | number | boolean, }
	readonly env?: Environment
}

/**
 * Prototype backend stack
 */
export class MicroServiceStack extends NestedStack {
	public readonly geoTrackingRestApi: RestApi

	public readonly geoTrackingRestApiKey: apigw.IApiKey

	public readonly eventBus: events.EventBus

	public readonly lambdaRefs: { [key: string]: lambda.IFunction, }

	public readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }

	constructor (scope: Construct, id: string, props: MicroServiceStackProps) {
		super(scope, id, props)

		const {
			geoPolygonTable,
			demographicAreaDispatchSettings,
			vpc,
			userPool,
			vpcNetworking,
			memoryDBCluster,
			openSearchDomain,
			driverDataIngestStream,
			memoryDBConfig,
			kinesisConfig,
			env,
		} = props

		// main comm eventbus
		const eventBus = new events.EventBus(this, 'CommEventBus', {
			eventBusName: namespaced(this, 'event-bus'),
		})
		this.eventBus = eventBus

		// create RestApi instance here, re-use everywhere else
		// also allow CORS
		const geoTrackingRestApi = new RestApi(this, 'GeoTrackingRestApi', {
			restApiName: namespaced(this, 'GeoTrackingRestApi'),
			defaultCorsPreflightOptions: {
				allowOrigins: apigw.Cors.ALL_ORIGINS,
				allowMethods: apigw.Cors.ALL_METHODS,
			},
		})
		this.geoTrackingRestApi = geoTrackingRestApi

		const lambdaUtilsLayer = new LambdaUtilsLayer(this, 'LambdaUtilsLayer')
		const redisClientLayer = new RedisClientLayer(this, 'RedisClientLayer')
		const openSearchClientLayer = new OpenSearchClientLayer(this, 'OpenSearchClientLayer')
		const lambdaInsightsLayer = LambdaInsightsLayer(this, 'LambdaInsightLayer')

		const lambdaLayers = {
			lambdaUtilsLayer,
			redisClientLayer,
			openSearchClientLayer,
			lambdaInsightsLayer,
		}
		this.lambdaLayers = lambdaLayers

		const { securityGroups } = vpcNetworking

		const lambdaFunctions = new LambdaFunctions(this, 'LambdaFunctions-Stack', {
			vpc,
			lambdaSecurityGroups: [securityGroups.lambda],
			memoryDBCluster,
			lambdaLayers,
			cleanupScheduleMins: 1,
			driverDataIngestStream: kinesis.Stream.fromStreamArn(this, 'DriverDataIngestStreamMS', driverDataIngestStream.streamArn),
			driverLocationUpdateTTLInMs: memoryDBConfig.driverLocationUpdateTTLInMS as number,
			openSearchDomain,
			eventBus,
			geofencingBatchSize: kinesisConfig.geofencingBatchSize as number,
			geofencingParallelizationFactor: kinesisConfig.geofencingParallelizationFactor as number,
			geofencingRetryAttempts: kinesisConfig.geofencingRetryAttempts as number,
			geofencingUseFanOutConsumer: kinesisConfig.geofencingUseFanOutConsumer as boolean,
			geofencingMaxBatchingWindowMs: kinesisConfig.geofencingMaxBatchingWindowMs as number,
			driverLocationUpdateBatchSize: kinesisConfig.driverLocationUpdateBatchSize as number,
			driverLocationUpdateParallelizationFactor: kinesisConfig.driverLocationUpdateParallelizationFactor as number,
			driverLocationUpdateRetryAttempts: kinesisConfig.driverLocationUpdateRetryAttempts as number,
			driverLocationUpdateUseFanOutConsumer: kinesisConfig.driverLocationUpdateUseFanOutConsumer as boolean,
			driverLocationUpdateMaxBatchingWindowMs: kinesisConfig.driverLocationUpdateMaxBatchingWindowMs as number,
		})

		const apiGeotracking = new ApiGeoTracking(this, 'ApiGeoTracking', {
			restApi: geoTrackingRestApi,
			userPool,
			lambdaLayers,
			vpc,
			lambdaSecurityGroups: [securityGroups.lambda],
			memoryDBCluster,
			geoPolygonTable,
			// for this API only the dispatcher settings table is being used
			demographicAreaDispatchSettings,
			openSearchDomain,
		})
		this.geoTrackingRestApiKey = apiGeotracking.geoTrackingApiKey

		const apiGeofencing = new ApiGeofencing(this, 'ApiGeofencing', {
			restApi: geoTrackingRestApi,
			userPool,
			lambdaLayers,
			vpc,
			lambdaSecurityGroups: [securityGroups.lambda],
			memoryDBCluster,
			eventBus,
		})

		this.lambdaRefs = {
			driverSearch: apiGeotracking.queryDrivers,
			driverStatusUpdateLambda: lambdaFunctions.driverStatusUpdateLambda,
			geofencing: apiGeofencing.geofencingLambda,
			esInitialSetup: lambdaFunctions.openSearchInitialSetupLambda,
		}
	}
}
