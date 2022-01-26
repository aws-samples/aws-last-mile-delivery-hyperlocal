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
import { Construct, NestedStack, NestedStackProps, Environment } from '@aws-cdk/core'
import { namespaced } from '@aws-play/cdk-core'
import { RestApi } from '@aws-play/cdk-apigateway'
import { Cors, IApiKey } from '@aws-cdk/aws-apigateway'
import { IFunction, ILayerVersion } from '@aws-cdk/aws-lambda'
import { Stream, IStream } from '@aws-cdk/aws-kinesis'
import { ITable } from '@aws-cdk/aws-dynamodb'
import { IUserPool } from '@aws-cdk/aws-cognito'
import { EventBus } from '@aws-cdk/aws-events'
import { CfnCacheCluster } from '@aws-cdk/aws-elasticache'
import { IDomain } from '@aws-cdk/aws-elasticsearch'
import { IVpc } from '@aws-cdk/aws-ec2'
import { LambdaUtilsLayer, ESClientLayer, RedisClientLayer, LambdaInsightsLayer } from '@prototype/lambda-common'
import { Networking } from '@prototype/networking'
import { ApiGeoTracking, ApiGeofencing } from '@prototype/api-geotracking'
import { LambdaFunctions } from '@prototype/lambda-functions'

export interface MicroServiceStackProps extends NestedStackProps {
	readonly vpc: IVpc
	readonly geoPolygonTable: ITable
	readonly demographicAreaDispatchSettings: ITable
	readonly userPool: IUserPool
	readonly vpcNetworking: Networking
	readonly redisCluster: CfnCacheCluster
	readonly elasticSearchCluster: IDomain
	readonly driverDataIngestStream: IStream
	readonly redisConfig: { [key: string]: string | number, }
	readonly kinesisConfig: { [key: string]: string | number | boolean, }
	readonly env?: Environment
}

/**
 * Prototype backend stack
 */
export class MicroServiceStack extends NestedStack {
	public readonly geoTrackingRestApi: RestApi

	public readonly geoTrackingRestApiKey: IApiKey

	public readonly eventBus: EventBus

	public readonly lambdaRefs: { [key: string]: IFunction, }

	public readonly lambdaLayers: { [key: string]: ILayerVersion, }

	constructor (scope: Construct, id: string, props: MicroServiceStackProps) {
		super(scope, id, props)

		const {
			geoPolygonTable,
			demographicAreaDispatchSettings,
			vpc,
			userPool,
			vpcNetworking,
			redisCluster,
			elasticSearchCluster,
			driverDataIngestStream,
			redisConfig,
			kinesisConfig,
			env,
		} = props

		// main comm eventbus
		const eventBus = new EventBus(this, 'CommEventBus', {
			eventBusName: namespaced(this, 'event-bus'),
		})
		this.eventBus = eventBus

		// create RestApi instance here, re-use everywhere else
		// also allow CORS
		const geoTrackingRestApi = new RestApi(this, 'GeoTrackingRestApi', {
			restApiName: namespaced(this, 'GeoTrackingRestApi'),
			defaultCorsPreflightOptions: {
				allowOrigins: Cors.ALL_ORIGINS,
				allowMethods: Cors.ALL_METHODS,
			},
		})
		this.geoTrackingRestApi = geoTrackingRestApi

		const lambdaUtilsLayer = new LambdaUtilsLayer(this, 'LambdaUtilsLayer')
		const redisClientLayer = new RedisClientLayer(this, 'RedisClientLayer')
		const esClientLayer = new ESClientLayer(this, 'ESClientLayer')
		const lambdaInsightsLayer = LambdaInsightsLayer(this, 'LambdaInsightLayer')

		// this.exportValue(lambdaUtilsLayer.layerVersionArn, { name: 'lambdaUtilsLayerExport' })
		// this.exportValue(redisClientLayer.layerVersionArn, { name: 'redisClientLayerExport' })
		// this.exportValue(esClientLayer.layerVersionArn, { name: 'esClientLayerExport' })
		// this.exportValue(lambdaInsightsLayer.layerVersionArn, { name: 'lambdaInsightsLayerExport' })

		const lambdaLayers = {
			lambdaUtilsLayer,
			redisClientLayer,
			esClientLayer,
			lambdaInsightsLayer,
		}
		this.lambdaLayers = lambdaLayers

		const { securityGroups } = vpcNetworking

		const lambdaFunctions = new LambdaFunctions(this, 'LambdaFunctions-Stack', {
			vpc,
			lambdaSecurityGroups: [securityGroups.lambda],
			redisCluster,
			lambdaLayers,
			cleanupScheduleMins: 1,
			driverDataIngestStream: Stream.fromStreamArn(this, 'DriverDataIngestStreamMS', driverDataIngestStream.streamArn),
			driverLocationUpdateTTLInMs: redisConfig.driverLocationUpdateTTLInMS as number,
			esDomain: elasticSearchCluster,
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
			redisCluster,
			geoPolygonTable,
			// for this API only the dispatcher settings table is being used
			demographicAreaDispatchSettings,
			esDomain: elasticSearchCluster,
		})
		this.geoTrackingRestApiKey = apiGeotracking.geoTrackingApiKey

		const apiGeofencing = new ApiGeofencing(this, 'ApiGeofencing', {
			restApi: geoTrackingRestApi,
			userPool,
			lambdaLayers,
			vpc,
			lambdaSecurityGroups: [securityGroups.lambda],
			redisCluster,
			eventBus,
		})

		this.lambdaRefs = {
			driverSearch: apiGeotracking.queryDrivers,
			driverStatusUpdateLambda: lambdaFunctions.driverStatusUpdateLambda,
			geofencing: apiGeofencing.geofencingLambda,
			esInitialSetup: lambdaFunctions.esInitialSetupLambda,
		}
	}
}
