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
import { IVpc, SubnetType, ISecurityGroup } from '@aws-cdk/aws-ec2'
import { Code, ILayerVersion } from '@aws-cdk/aws-lambda'
import { EventBus } from '@aws-cdk/aws-events'
import * as iam from '@aws-cdk/aws-iam'
import { IDomain } from '@aws-cdk/aws-elasticsearch'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { CfnCacheCluster } from '@aws-cdk/aws-elasticache'
import { AllowESWrite, LambdaInsightsExecutionPolicy } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Environment extends DeclaredLambdaEnvironment {
	readonly ES_DOMAIN_ENDPOINT: string
	readonly REDIS_HOST: string
	readonly REDIS_PORT: string
	readonly EVENT_BUS_NAME: string
	readonly SERVICE_NAME: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly vpc: IVpc
	readonly lambdaSecurityGroups: ISecurityGroup[]
	readonly redisCluster: CfnCacheCluster
	readonly lambdaLayers: ILayerVersion[]
	readonly eventBus: EventBus
	readonly esDomain: IDomain
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class DriverStatusUpdateLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			vpc,
			lambdaSecurityGroups,
			redisCluster,
			lambdaLayers,
			eventBus,
			esDomain,
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'DriverStatusUpdate'),
			description: 'Driver Status Update function',
			code: Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/driver-status-update.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				REDIS_HOST: redisCluster.attrRedisEndpointAddress,
				REDIS_PORT: redisCluster.attrRedisEndpointPort,
				EVENT_BUS_NAME: eventBus.eventBusName,
				SERVICE_NAME: SERVICE_NAME.DRIVER_SERVICE,
				ES_DOMAIN_ENDPOINT: esDomain.domainEndpoint,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'events:PutEvents',
					],
					effect: iam.Effect.ALLOW,
					resources: [eventBus.eventBusArn],
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
