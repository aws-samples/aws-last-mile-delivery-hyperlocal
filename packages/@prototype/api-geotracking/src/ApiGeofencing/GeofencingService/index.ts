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
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { EventBus } from '@aws-cdk/aws-events'
import { IVpc, SubnetType, ISecurityGroup } from '@aws-cdk/aws-ec2'
import { ILayerVersion } from '@aws-cdk/aws-lambda'
import { CfnCacheCluster } from '@aws-cdk/aws-elasticache'
import { namespaced } from '@aws-play/cdk-core'
import { LambdaInsightsExecutionPolicy } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Environment extends DeclaredLambdaEnvironment {
    readonly REDIS_HOST: string
    readonly REDIS_PORT: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly vpc: IVpc
	readonly lambdaSecurityGroups: ISecurityGroup[]
	readonly redisCluster: CfnCacheCluster
	readonly lambdaLayers: ILayerVersion[]
	readonly eventBus: EventBus
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class GeofencingServiceLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: cdk.Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			vpc,
			lambdaSecurityGroups,
			redisCluster,
			lambdaLayers,
			eventBus,
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'GeofencingServiceLambda'),
			description: 'Lambda used to provide geofencing functionalities',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/geofencing.zip')),
			dependencies: props.dependencies,
			runtime: lambda.Runtime.NODEJS_12_X,
			timeout: cdk.Duration.seconds(120),
			environment: {
				REDIS_HOST: redisCluster.attrRedisEndpointAddress,
				REDIS_PORT: redisCluster.attrRedisEndpointPort,
				EVENT_BUS_NAME: eventBus.eventBusName,
				SERVICE_NAME: SERVICE_NAME.GEOFENCING_SERVICE,
			},
			layers: lambdaLayers,
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'events:PutEvents',
					],
					effect: iam.Effect.ALLOW,
					resources: [eventBus.eventBusArn],
				}),
			],
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
