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
import { CustomResource, Duration, aws_ec2 as ec2, aws_iam as iam, custom_resources as cr, aws_lambda as lambda } from 'aws-cdk-lib'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ESInitialSetupProps {
	readonly vpc: ec2.IVpc
	readonly lambdaSecurityGroups: ec2.ISecurityGroup[]
	readonly setupLambdaArn: string
}

export class ESInitialSetup extends Construct {
	constructor (scope: Construct, id: string, props: ESInitialSetupProps) {
		super(scope, id)

		const { vpc, lambdaSecurityGroups, setupLambdaArn } = props

		const esSetupLambda = new lambda.Function(this, 'ESSetup-CR', {
			functionName: namespaced(scope, 'ES-Initial-Setup-CustomResource'),
			description: 'Setup initial ES settings - Custom Resource Lambda',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/es-setup-customresource.zip')),
			handler: 'index.onEvent',
			runtime: lambda.Runtime.NODEJS_14_X,
			environment: {
				SETUP_LAMBDA_ARN: setupLambdaArn,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
					actions: ['lambda:InvokeFunction'],
					resources: [setupLambdaArn],
				}),
			],
			timeout: Duration.seconds(20),
			vpc,
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
			},
			securityGroups: lambdaSecurityGroups,
		})

		const esSetupProvider = new cr.Provider(this, 'ESSetupProvider', {
			onEventHandler: esSetupLambda,
			vpc,
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
			},
			securityGroups: lambdaSecurityGroups,
		})

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const esSetupCustomResource = new CustomResource(this, 'ESSetupCR', {
			serviceToken: esSetupProvider.serviceToken,
		})
	}
}
