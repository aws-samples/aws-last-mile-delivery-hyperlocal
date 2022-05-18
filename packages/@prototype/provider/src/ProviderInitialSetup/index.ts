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
import { Duration, CustomResource, aws_iam as iam, aws_lambda as lambda, custom_resources as cr } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'

export interface ProviderInitialSetupProps {
	apiKeySecretNameList: {
		keyArn: string
		keyId: string
		secret: string
	}[]
}

export class ProviderInitialSetup extends Construct {
	constructor (scope: Construct, id: string, props: ProviderInitialSetupProps) {
		super(scope, id)

		const { apiKeySecretNameList } = props

		// console.log(apiKeyArnSecretNameList)

		const apiKeyValuesToSecretsManagerLambda = new lambda.Function(this, 'ProviderInitialSetupLambda', {
			functionName: namespaced(scope, 'ProviderInitialSetup-CustomResource'),
			description: `Setup provider APIkey secrets - Custom Resource Lambda. Last update: ${Date.now()}`,
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/provider-setup-customresource.zip')),
			handler: 'index.onEvent',
			runtime: lambda.Runtime.NODEJS_16_X,
			architecture: lambda.Architecture.ARM_64,
			environment: {
				APIKEY_SECRETNAME_JSON: JSON.stringify(apiKeySecretNameList.map(item => {
					return { keyId: item.keyId, secret: item.secret }
				})),
			},
			initialPolicy: [
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
					actions: [
						'secretsManager:CreateSecret',
						'secretsManager:ListSecrets',
						'secretsManager:GetSecretValue',
						'secretsManager:PutSecretValue',
					],
					resources: ['*'],
				}),
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
					actions: [
						'apigateway:GET',
					],
					resources: apiKeySecretNameList.map(item => item.keyArn),
				}),
			],
			timeout: Duration.seconds(20),
		})

		const providerSetupProvider = new cr.Provider(this, 'ProviderSetupProvider', {
			onEventHandler: apiKeyValuesToSecretsManagerLambda,
		})

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const esSetupCustomResource = new CustomResource(this, 'ProviderSetupCR', {
			serviceToken: providerSetupProvider.serviceToken,
		})
	}
}
