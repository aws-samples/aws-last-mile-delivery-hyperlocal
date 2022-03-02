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
import { Duration, Stack, aws_ec2 as ec2, aws_events as events, aws_events_targets as events_targets, aws_lambda as lambda, aws_iam as iam } from 'aws-cdk-lib'
import { Networking } from '@prototype/networking'
import { MemoryDBCluster } from '@prototype/live-data-cache'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { SERVICE_NAME, PROVIDER_NAME } from '@prototype/common'

export interface StatisticsProps {
	readonly privateVpc: ec2.IVpc
	readonly vpcNetworking: Networking
	readonly memoryDBCluster: MemoryDBCluster
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }
	readonly eventBus: events.EventBus
}

export class StatisticsLambda extends Construct {
	public readonly lambda: lambda.Function

	constructor (scope: Construct, id: string, props: StatisticsProps) {
		super(scope, id)

		const stack = Stack.of(this)
		const {
			eventBus,
			memoryDBCluster,
			privateVpc,
			vpcNetworking,
			lambdaLayers,
		} = props

		this.lambda = new lambda.Function(this, 'StatisticsLambda', {
			functionName: namespaced(this, 'StatisticsLambda'),
			description: 'Lambda used to consume event bridge events and build up statistics in redis to generate a system wide state',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/statistics-lambda.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_14_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.seconds(120),
			environment: {
				MEMORYDB_HOST: memoryDBCluster.cluster.attrClusterEndpointAddress,
				MEMORYDB_PORT: memoryDBCluster.cluster.port?.toString() || '',
				MEMORYDB_ADMIN_USERNAME: memoryDBCluster.adminUsername,
				MEMORYDB_ADMIN_SECRET: memoryDBCluster.adminPasswordSecret.secretArn,
				DISPATCH_ENGINE_SERVICE: SERVICE_NAME.DISPATCH_ENGINE,
				ORDER_SERVICE_NAME: SERVICE_NAME.ORDER_SERVICE,
				DRIVER_SERVICE_NAME: SERVICE_NAME.DRIVER_SERVICE,
				ORDER_MANAGER_SERVICE_NAME: SERVICE_NAME.ORDER_MANAGER,
				EXAMPLE_POLLING_PROVIDER_SERVICE_NAME: SERVICE_NAME.EXAMPLE_POLLING_PROVIDER_SERVICE,
				EXAMPLE_POLLING_PROVIDER_NAME: PROVIDER_NAME.EXAMPLE_POLLING_PROVIDER,
				EXAMPLE_WEBHOOK_PROVIDER_SERVICE_NAME: SERVICE_NAME.EXAMPLE_WEBHOOK_PROVIDER_SERVICE,
				EXAMPLE_WEBHOOK_PROVIDER_NAME: PROVIDER_NAME.EXAMPLE_WEBHOOK_PROVIDER,
				INSTANT_DELIVERY_PROVIDER_SERVICE_NAME: SERVICE_NAME.INSTANT_DELIVERY_PROVIDER_SERVICE,
				INSTANT_DELIVERY_PROVIDER_NAME: PROVIDER_NAME.INSTANT_DELIVERY_PROVIDER,
			},
			initialPolicy: [
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
			layers: [
				lambdaLayers.lambdaUtilsLayer,
				lambdaLayers.redisClientLayer,
			],
			vpc: privateVpc,
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
			},
			securityGroups: [vpcNetworking.securityGroups.lambda],
		})

		new events.Rule(this, 'StatsCatchAllRule', {
			ruleName: namespaced(this, 'stats-catch-all'),
			description: 'Used for stats purpose',
			eventBus,
			enabled: true,
			targets: [new events_targets.LambdaFunction(this.lambda)],
			eventPattern: {
				// catch all events in the bus
				account: [stack.account],
			},
		})
	}
}
