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
import { Duration, aws_lambda as lambda, aws_iam as iam, aws_stepfunctions as stepfunctions, aws_ec2 as ec2, aws_dynamodb as ddb } from 'aws-cdk-lib'
import { MemoryDBCluster } from '@prototype/live-data-cache'
import { Networking } from '@prototype/networking'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { LambdaInsightsExecutionPolicy } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'

interface Environment extends DeclaredLambdaEnvironment {
	readonly MEMORYDB_ADMIN_USERNAME: string
	readonly MEMORYDB_ADMIN_SECRET: string
	readonly MEMORYDB_HOST: string
	readonly MEMORYDB_PORT: string
	readonly ORDER_TABLE: string
	readonly ORDER_ORCHESTRATOR_STATE_MACHINE: string
	readonly ORDER_SERVICE_NAME: string
	readonly ORIGIN_SERVICE_NAME: string
	readonly EXAMPLE_WEBHOOK_PROVIDER_SERVICE_NAME: string
	readonly EXAMPLE_POLLING_PROVIDER_SERVICE_NAME: string
	readonly INSTANT_DELIVERY_PROVIDER_SERVICE_NAME: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly orderTable: ddb.ITable
	readonly orderOrchestrator: stepfunctions.IStateMachine
	readonly privateVpc: ec2.IVpc
	readonly vpcNetworking: Networking
	readonly memoryDBCluster: MemoryDBCluster
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class OrderManagerHandlerLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			orderTable,
			orderOrchestrator,
			privateVpc,
			vpcNetworking,
			memoryDBCluster,
			lambdaLayers,
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'OrderManagerHandlerLambda'),
			description: 'Lambda used to handle incoming events from event bridge relative to order lifecycle',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/order-manager-handler.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(120),
			environment: {
				MEMORYDB_HOST: memoryDBCluster.cluster.attrClusterEndpointAddress,
				MEMORYDB_PORT: memoryDBCluster.cluster.port?.toString() || '',
				MEMORYDB_ADMIN_USERNAME: memoryDBCluster.adminUsername,
				MEMORYDB_ADMIN_SECRET: memoryDBCluster.adminPasswordSecret.secretArn,
				ORDER_TABLE: orderTable.tableName,
				ORDER_ORCHESTRATOR_STATE_MACHINE: orderOrchestrator.stateMachineArn,
				ORDER_SERVICE_NAME: SERVICE_NAME.ORDER_SERVICE,
				ORIGIN_SERVICE_NAME: SERVICE_NAME.ORIGIN_SERVICE,
				EXAMPLE_WEBHOOK_PROVIDER_SERVICE_NAME: SERVICE_NAME.EXAMPLE_WEBHOOK_PROVIDER_SERVICE,
				EXAMPLE_POLLING_PROVIDER_SERVICE_NAME: SERVICE_NAME.EXAMPLE_POLLING_PROVIDER_SERVICE,
				INSTANT_DELIVERY_PROVIDER_SERVICE_NAME: SERVICE_NAME.INSTANT_DELIVERY_PROVIDER_SERVICE,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'dynamodb:GetItem',
						'dynamodb:UpdateItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [orderTable.tableArn],
				}),
				new iam.PolicyStatement({
					actions: ['states:StartExecution'],
					resources: [
						orderOrchestrator.stateMachineArn,
					],
					effect: iam.Effect.ALLOW,
				}),
				new iam.PolicyStatement({
					actions: ['states:SendTaskSuccess', 'states:SendTaskFailure'],
					resources: ['*'],
					effect: iam.Effect.ALLOW,
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
			vpc: privateVpc,
			layers: [
				lambdaLayers.lambdaUtilsLayer,
				lambdaLayers.redisClientLayer,
				lambdaLayers.lambdaInsightsLayer,
			],
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
			},
			securityGroups: [vpcNetworking.securityGroups.lambda],
		}

		super(scope, id, declaredProps)

		if (this.role) {
			this.role.addManagedPolicy(LambdaInsightsExecutionPolicy())
		}
	}
}
