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
import { aws_ec2 as ec2, aws_lambda as lambda, aws_elasticache as elasticache, aws_events as events, aws_elasticsearch as elasticsearch, aws_events_targets as events_targets, aws_kinesis as kinesis } from 'aws-cdk-lib'
import { KinesisConsumer } from '@prototype/lambda-common'
import { DriverLocationCleanupLambda } from './DriverLocationCleanupLambda'
import { namespaced } from '@aws-play/cdk-core'
import { DriverLocationUpdateIngestLambda } from './DriverLocationUpdateIngestLambda'
import { DriverStatusUpdateLambda } from './DriverStatusUpdateIngestLambda'
import { DriverGeofencingtLambda } from './DriverGeofencingLambda'
import { ESInitialSetupLambda } from './ESInitialSetupLambda'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LambdaFunctionsProps {
	readonly vpc: ec2.IVpc
	readonly lambdaSecurityGroups: ec2.ISecurityGroup[]
	readonly redisCluster: elasticache.CfnCacheCluster
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }
	readonly cleanupScheduleMins: number
	readonly driverDataIngestStream: kinesis.IStream
	readonly driverLocationUpdateTTLInMs: number
	readonly driverLocationUpdateBatchSize: number
	readonly driverLocationUpdateParallelizationFactor: number
	readonly driverLocationUpdateRetryAttempts: number
	readonly driverLocationUpdateUseFanOutConsumer: boolean
	readonly driverLocationUpdateMaxBatchingWindowMs: number
	readonly geofencingBatchSize: number
	readonly geofencingParallelizationFactor: number
	readonly geofencingRetryAttempts: number
	readonly geofencingUseFanOutConsumer: boolean
	readonly geofencingMaxBatchingWindowMs: number
	readonly esDomain: elasticsearch.IDomain
	readonly eventBus: events.EventBus
}

export class LambdaFunctions extends Construct {
	readonly driverLocationCleanupLambda: lambda.IFunction

	readonly driverDataIngestLambda: lambda.IFunction

	readonly driverStatusUpdateLambda: lambda.IFunction

	readonly driverGeofencingLambda: lambda.IFunction

	readonly esInitialSetupLambda: lambda.IFunction

	constructor (scope: Construct, id: string, props: LambdaFunctionsProps) {
		super(scope, id)

		const {
			vpc, lambdaSecurityGroups,
			redisCluster, lambdaLayers,
			cleanupScheduleMins,
			driverDataIngestStream,
			driverLocationUpdateTTLInMs,
			esDomain,
			eventBus,
			driverLocationUpdateBatchSize,
			driverLocationUpdateParallelizationFactor,
			driverLocationUpdateRetryAttempts,
			driverLocationUpdateUseFanOutConsumer,
			driverLocationUpdateMaxBatchingWindowMs,
			geofencingBatchSize,
			geofencingParallelizationFactor,
			geofencingRetryAttempts,
			geofencingUseFanOutConsumer,
			geofencingMaxBatchingWindowMs,
		} = props

		const driverLocationCleanupLambda = new DriverLocationCleanupLambda(this, 'DriverLocationCleanupLambda', {
			dependencies: {
				vpc,
				lambdaSecurityGroups,
				redisCluster,
				lambdaLayers: [
					lambdaLayers.lambdaUtilsLayer,
					lambdaLayers.redisClientLayer,
					lambdaLayers.esClientLayer,
					lambdaLayers.lambdaInsightsLayer,
				],
				driverLocationUpdateTTLInMs,
				esDomain,
			},
		})

		this.driverLocationCleanupLambda = driverLocationCleanupLambda

		const driverLocationCleanupLambdaTarget = new events_targets.LambdaFunction(driverLocationCleanupLambda)

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const driverLocationCleanupRule = new events.Rule(this, 'DriverLocationCleanupRule', {
			description: 'Driver Location Cleanup Rule',
			ruleName: namespaced(this, 'DriverLocationCleanupRule'),
			targets: [driverLocationCleanupLambdaTarget],
			schedule: events.Schedule.cron({ minute: `*/${cleanupScheduleMins}` }),
		})

		const driverLocationUpdateIngestLambda = new DriverLocationUpdateIngestLambda(this, 'DriverLocationUpdateIngestLambda', {
			dependencies: {
				ingestDataStream: driverDataIngestStream,
				externalDeps: {
					vpc,
					lambdaSecurityGroups,
					lambdaLayers: [
						lambdaLayers.lambdaUtilsLayer,
						lambdaLayers.redisClientLayer,
						lambdaLayers.esClientLayer,
						lambdaLayers.lambdaInsightsLayer,
					],
					redisCluster,
					driverLocationUpdateTTLInMs,
					esDomain,
				},
			},
		})
		new KinesisConsumer(this, 'KinesisIngestConsumer', {
			baseName: 'driverIngest',
			kinesisStream: driverDataIngestStream,
			lambdaFn: driverLocationUpdateIngestLambda,
			batchSize: driverLocationUpdateBatchSize,
			parallelizationFactor: driverLocationUpdateParallelizationFactor,
			retryAttempts: driverLocationUpdateRetryAttempts,
			useFanOutConsumer: driverLocationUpdateUseFanOutConsumer,
			maxBatchingWindowMs: driverLocationUpdateMaxBatchingWindowMs,
		})
		this.driverDataIngestLambda = driverLocationUpdateIngestLambda

		const driverGeofencingLambda = new DriverGeofencingtLambda(this, 'DriverGeofencingLambda', {
			dependencies: {
				ingestDataStream: driverDataIngestStream,
				externalDeps: {
					vpc,
					lambdaSecurityGroups,
					lambdaLayers: [
						lambdaLayers.lambdaUtilsLayer,
						lambdaLayers.redisClientLayer,
						lambdaLayers.esClientLayer,
						lambdaLayers.lambdaInsightsLayer,
					],
					redisCluster,
					esDomain,
					eventBus,
				},
			},
		})
		new KinesisConsumer(this, 'KinesisGeofencingConsumer', {
			baseName: 'geofencing',
			kinesisStream: driverDataIngestStream,
			lambdaFn: driverGeofencingLambda,
			batchSize: geofencingBatchSize,
			parallelizationFactor: geofencingParallelizationFactor,
			retryAttempts: geofencingRetryAttempts,
			useFanOutConsumer: geofencingUseFanOutConsumer,
			maxBatchingWindowMs: geofencingMaxBatchingWindowMs,
		})

		this.driverGeofencingLambda = driverGeofencingLambda

		const driverStatusUpdateLambda = new DriverStatusUpdateLambda(this, 'DriverStatusUpdateLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				redisCluster,
				lambdaLayers: [
					lambdaLayers.lambdaUtilsLayer,
					lambdaLayers.redisClientLayer,
					lambdaLayers.esClientLayer,
					lambdaLayers.lambdaInsightsLayer,
				],
				esDomain,
			},
		})

		this.driverStatusUpdateLambda = driverStatusUpdateLambda

		const esInitialSetupLambda = new ESInitialSetupLambda(this, 'ESInitialSetupLambda', {
			dependencies: {
				esDomain,
				lambdaLayers: [
					lambdaLayers.lambdaUtilsLayer,
					lambdaLayers.esClientLayer,
					lambdaLayers.lambdaInsightsLayer,
				],
				lambdaSecurityGroups,
				vpc,
			},
		})
		this.esInitialSetupLambda = esInitialSetupLambda
	}
}
