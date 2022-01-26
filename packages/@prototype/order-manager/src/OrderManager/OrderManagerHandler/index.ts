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
import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as iam from '@aws-cdk/aws-iam'
import * as step from '@aws-cdk/aws-stepfunctions'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as elasticache from '@aws-cdk/aws-elasticache'
import { Networking } from '@prototype/networking'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { ITable } from '@aws-cdk/aws-dynamodb'
import { namespaced } from '@aws-play/cdk-core'
import { LambdaInsightsExecutionPolicy } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Environment extends DeclaredLambdaEnvironment {
    readonly ORDER_TABLE: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly orderTable: ITable
	readonly orderOrchestrator: step.IStateMachine
	readonly privateVpc: ec2.IVpc
	readonly vpcNetworking: Networking
	readonly redisCluster: elasticache.CfnCacheCluster
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class OrderManagerHandlerLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: cdk.Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			orderTable,
			orderOrchestrator,
			privateVpc,
			vpcNetworking,
			redisCluster,
			lambdaLayers,
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'OrderManagerHandlerLambda'),
			description: 'Lambda used to handle incoming events from event bridge relative to order lifecycle',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/order-manager-handler.zip')),
			dependencies: props.dependencies,
			runtime: lambda.Runtime.NODEJS_12_X,
			timeout: cdk.Duration.seconds(120),
			environment: {
				REDIS_HOST: redisCluster.attrRedisEndpointAddress,
				REDIS_PORT: redisCluster.attrRedisEndpointPort,
				ORDER_TABLE: orderTable.tableName,
				ORDER_ORCHESTRATOR_STATE_MACHINE: orderOrchestrator.stateMachineArn,
				ORDER_SERVICE_NAME: SERVICE_NAME.ORDER_SERVICE,
				RESTAURANT_SERVICE_NAME: SERVICE_NAME.RESTAURANT_SERVICE,
				EXAMPLE_WEBHOOK_PROVIDER_SERVICE_NAME: SERVICE_NAME.EXAMPLE_WEBHOOK_PROVIDER_SERVICE,
				EXAMPLE_POLLING_PROVIDER_SERVICE_NAME: SERVICE_NAME.EXAMPLE_POLLING_PROVIDER_SERVICE,
				INTERNAL_WEBHOOK_PROVIDER_SERVICE_NAME: SERVICE_NAME.INTERNAL_WEBHOOK_PROVIDER_SERVICE,
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
			],
			vpc: privateVpc,
			layers: [
				lambdaLayers.lambdaUtilsLayer,
				lambdaLayers.redisClientLayer,
				lambdaLayers.lambdaInsightsLayer,
			],
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE,
			},
			securityGroups: [vpcNetworking.securityGroups.lambda],
		}

		super(scope, id, declaredProps)

		if (this.role) {
			this.role.addManagedPolicy(LambdaInsightsExecutionPolicy())
		}
	}
}
