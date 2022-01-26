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
import { Duration, Construct } from '@aws-cdk/core'
import { IStream } from '@aws-cdk/aws-kinesis'
import { IVpc, SubnetType, ISecurityGroup } from '@aws-cdk/aws-ec2'
import { Code, ILayerVersion } from '@aws-cdk/aws-lambda'
import { EventBus } from '@aws-cdk/aws-events'
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { Kinesis } from 'cdk-iam-actions/lib/actions'
import { CfnCacheCluster } from '@aws-cdk/aws-elasticache'
import { IDomain } from '@aws-cdk/aws-elasticsearch'
import { LambdaInsightsExecutionPolicy } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DriverGeofencingtLambdaExternalDeps {
	readonly vpc: IVpc
	readonly lambdaSecurityGroups: ISecurityGroup[]
	readonly redisCluster: CfnCacheCluster
	readonly lambdaLayers: ILayerVersion[]
	readonly esDomain: IDomain
	readonly eventBus: EventBus
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Environment extends DeclaredLambdaEnvironment {
	readonly REDIS_HOST: string
	readonly REDIS_PORT: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly ingestDataStream: IStream
	readonly externalDeps: DriverGeofencingtLambdaExternalDeps
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class DriverGeofencingtLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			ingestDataStream,
			externalDeps: {
				vpc,
				lambdaSecurityGroups,
				redisCluster,
				lambdaLayers,
				eventBus,
			},
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'DriverGeofencing'),
			description: 'Driver Geofencing handler lambda function',
			code: Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/driver-geofencing.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				REDIS_HOST: redisCluster.attrRedisEndpointAddress,
				REDIS_PORT: redisCluster.attrRedisEndpointPort,
				EVENT_BUS: eventBus.eventBusName,
				SERVICE_NAME: SERVICE_NAME.GEOFENCING_SERVICE,
			},
			initialPolicy: [
				new PolicyStatement({
					actions: [
						'events:PutEvents',
					],
					effect: Effect.ALLOW,
					resources: [eventBus.eventBusArn],
				}),
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: [
						Kinesis.DESCRIBE_STREAM,
						'kinesis:DescribeStreamSummary',
						Kinesis.GET_RECORDS,
						Kinesis.GET_SHARD_ITERATOR,
						'kinesis:ListShards',
						Kinesis.LIST_STREAMS,
						'kinesis:SubscribeToShard',
					],
					resources: [ingestDataStream.streamArn],
				}),
			],
			layers: lambdaLayers,
			vpc,
			vpcSubnets: {
				subnetType: SubnetType.PRIVATE,
			},
			securityGroups: lambdaSecurityGroups,
		}

		super(scope, id, declaredProps)

		if (this.role) {
			this.role.addManagedPolicy(LambdaInsightsExecutionPolicy())
		}
	}
}
