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
import { Construct, CustomResource, Duration } from '@aws-cdk/core'
import { IVpc, SubnetType, ISecurityGroup } from '@aws-cdk/aws-ec2'
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam'
import { Provider } from '@aws-cdk/custom-resources'
import { Function as LambdaFunction, Code, Runtime } from '@aws-cdk/aws-lambda'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ESInitialSetupProps {
	readonly vpc: IVpc
	readonly lambdaSecurityGroups: ISecurityGroup[]
	readonly setupLambdaArn: string
}

export class ESInitialSetup extends Construct {
	constructor (scope: Construct, id: string, props: ESInitialSetupProps) {
		super(scope, id)

		const { vpc, lambdaSecurityGroups, setupLambdaArn } = props

		const esSetupLambda = new LambdaFunction(this, 'ESSetup-CR', {
			functionName: namespaced(scope, 'ES-Initial-Setup-CustomResource'),
			description: 'Setup initial ES settings - Custom Resource Lambda',
			code: Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/es-setup-customresource.zip')),
			handler: 'index.onEvent',
			runtime: Runtime.NODEJS_12_X,
			environment: {
				SETUP_LAMBDA_ARN: setupLambdaArn,
			},
			initialPolicy: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['lambda:InvokeFunction'],
					resources: [setupLambdaArn],
				}),
			],
			timeout: Duration.seconds(20),
			vpc,
			vpcSubnets: {
				subnetType: SubnetType.PRIVATE,
			},
			securityGroups: lambdaSecurityGroups,
		})

		const esSetupProvider = new Provider(this, 'ESSetupProvider', {
			onEventHandler: esSetupLambda,
			vpc,
			vpcSubnets: {
				subnetType: SubnetType.PRIVATE,
			},
			securityGroups: lambdaSecurityGroups,
		})

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const esSetupCustomResource = new CustomResource(this, 'ESSetupCR', {
			serviceToken: esSetupProvider.serviceToken,
		})
	}
}
