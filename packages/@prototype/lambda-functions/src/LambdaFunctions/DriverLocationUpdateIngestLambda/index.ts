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
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { Kinesis } from 'cdk-iam-actions/lib/actions'
import { CfnCacheCluster } from '@aws-cdk/aws-elasticache'
import { IDomain } from '@aws-cdk/aws-elasticsearch'
import { AllowESWrite, LambdaInsightsExecutionPolicy } from '@prototype/lambda-common'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DriverLocationUpdateIngestLambdaExternalDeps {
	readonly vpc: IVpc
	readonly lambdaSecurityGroups: ISecurityGroup[]
	readonly redisCluster: CfnCacheCluster
	readonly lambdaLayers: ILayerVersion[]
	readonly driverLocationUpdateTTLInMs: number
	readonly esDomain: IDomain
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Environment extends DeclaredLambdaEnvironment {
	readonly DRIVER_LOCATION_UPDATE_TTL_MS: string
	readonly REDIS_HOST: string
	readonly REDIS_PORT: string
	readonly ES_DOMAIN_ENDPOINT: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly ingestDataStream: IStream
	readonly externalDeps: DriverLocationUpdateIngestLambdaExternalDeps
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class DriverLocationUpdateIngestLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			ingestDataStream,
			externalDeps: {
				vpc,
				lambdaSecurityGroups,
				redisCluster,
				lambdaLayers,
				driverLocationUpdateTTLInMs,
				esDomain,
			},
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'DriverLocationUpdateIngest'),
			description: 'Driver Location Update ingest function',
			code: Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/driver-location-update-ingest.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				REDIS_HOST: redisCluster.attrRedisEndpointAddress,
				REDIS_PORT: redisCluster.attrRedisEndpointPort,
				DRIVER_LOCATION_UPDATE_TTL_MS: `${driverLocationUpdateTTLInMs}`,
				ES_DOMAIN_ENDPOINT: esDomain.domainEndpoint,
			},
			initialPolicy: [
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
				AllowESWrite(esDomain.domainArn),
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
