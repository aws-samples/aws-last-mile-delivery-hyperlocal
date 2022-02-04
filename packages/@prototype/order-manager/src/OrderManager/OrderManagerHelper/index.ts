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
import { Duration, aws_lambda as lambda, aws_iam as iam, aws_ec2 as ec2, aws_elasticache as elasticache, aws_dynamodb as ddb, aws_events as events } from 'aws-cdk-lib'
import { Networking } from '@prototype/networking'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { LambdaInsightsExecutionPolicy } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Environment extends DeclaredLambdaEnvironment {
    readonly ORDER_TABLE: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly orderTable: ddb.ITable
	readonly eventBus: events.EventBus
	readonly privateVpc: ec2.IVpc
	readonly vpcNetworking: Networking
	readonly redisCluster: elasticache.CfnCacheCluster
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class OrderManagerHelperLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			orderTable,
			eventBus,
			privateVpc,
			lambdaLayers,
			vpcNetworking,
			redisCluster,
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'OrderManagerHelperLambda'),
			description: 'Lambda used by Order Orchestrator to perform actions on the Step Functions workflow',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/order-manager-helper.zip')),
			dependencies: props.dependencies,
			runtime: lambda.Runtime.NODEJS_12_X,
			timeout: Duration.seconds(120),
			environment: {
				REDIS_HOST: redisCluster.attrRedisEndpointAddress,
				REDIS_PORT: redisCluster.attrRedisEndpointPort,
				ORDER_TABLE: orderTable.tableName,
				EVENT_BUS: eventBus.eventBusArn,
				SERVICE_NAME: SERVICE_NAME.ORDER_MANAGER,
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
					actions: [
						'events:PutEvents',
					],
					effect: iam.Effect.ALLOW,
					resources: [eventBus.eventBusArn],
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
