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
import { Duration, aws_kinesis as kinesis, aws_ec2 as ec2, aws_lambda as lambda, aws_events as events, aws_iam as iam, aws_opensearchservice as opensearchservice } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { MemoryDBCluster } from '@prototype/live-data-cache'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { Kinesis } from 'cdk-iam-actions/lib/actions'
import { LambdaInsightsExecutionPolicy } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'

export interface DriverGeofencingtLambdaExternalDeps {
	readonly vpc: ec2.IVpc
	readonly lambdaSecurityGroups: ec2.ISecurityGroup[]
	readonly memoryDBCluster: MemoryDBCluster
	readonly lambdaLayers: lambda.ILayerVersion[]
	readonly openSearchDomain: opensearchservice.IDomain
	readonly eventBus: events.EventBus
}

interface Environment extends DeclaredLambdaEnvironment {
	readonly MEMORYDB_ADMIN_USERNAME: string
	readonly MEMORYDB_ADMIN_SECRET: string
	readonly MEMORYDB_HOST: string
	readonly MEMORYDB_PORT: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly ingestDataStream: kinesis.IStream
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
				memoryDBCluster,
				lambdaLayers,
				eventBus,
			},
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'DriverGeofencing'),
			description: 'Driver Geofencing handler lambda function',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/driver-geofencing.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				MEMORYDB_HOST: memoryDBCluster.cluster.attrClusterEndpointAddress,
				MEMORYDB_PORT: memoryDBCluster.cluster.port?.toString() || '',
				MEMORYDB_ADMIN_USERNAME: memoryDBCluster.adminUsername,
				MEMORYDB_ADMIN_SECRET: memoryDBCluster.adminPasswordSecret.secretArn,
				EVENT_BUS: eventBus.eventBusName,
				SERVICE_NAME: SERVICE_NAME.GEOFENCING_SERVICE,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'events:PutEvents',
					],
					effect: iam.Effect.ALLOW,
					resources: [eventBus.eventBusArn],
				}),
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
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
				new iam.PolicyStatement({
					actions: [
						'secretsmanager:GetSecretValue',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						`${memoryDBCluster.adminPasswordSecret.secretArn}*`,
					],
				}),
			],
			layers: lambdaLayers,
			vpc,
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
			},
			securityGroups: lambdaSecurityGroups,
		}

		super(scope, id, declaredProps)

		if (this.role) {
			this.role.addManagedPolicy(LambdaInsightsExecutionPolicy())
		}
	}
}
