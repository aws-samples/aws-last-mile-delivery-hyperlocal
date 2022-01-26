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
import { Construct, NestedStack, NestedStackProps } from '@aws-cdk/core'
import { ESInitialSetup } from '@prototype/live-data-cache'
import { IVpc } from '@aws-cdk/aws-ec2'
import { ProviderInitialSetup } from '@prototype/provider'
import { ProviderStack } from '../ProviderStack'
import { Networking } from '@prototype/networking'
import { IFunction } from '@aws-cdk/aws-lambda'

export interface ApiKeySecretConfigItem {
	keyArn: string
	keyId: string
	secret: string
}
export interface CustomResourcesStackProps extends NestedStackProps {
	readonly vpc: IVpc
	readonly vpcNetworking: Networking
	readonly lambdaRefs: { [key: string]: IFunction, }
	readonly providerNestedStack: ProviderStack
	readonly providersConfig: { [key: string]: any, }
	readonly additionalApiConfig?: ApiKeySecretConfigItem[]
}

/**
 * Prototype backend stack
 */
export class CustomResourcesStack extends NestedStack {
	constructor (scope: Construct, id: string, props: CustomResourcesStackProps) {
		super(scope, id, props)

		const {
			vpc,
			vpcNetworking: {
				securityGroups,
			},
			lambdaRefs,
			providerNestedStack,
			providersConfig,
			additionalApiConfig,
		} = props

		const esSetup = new ESInitialSetup(this, 'ESSetup', {
			lambdaSecurityGroups: [securityGroups.lambda],
			vpc,
			setupLambdaArn: lambdaRefs.esInitialSetup.functionArn,
		})

		let apiKeySecretNameList: ApiKeySecretConfigItem[] = [
			{
				keyArn: providerNestedStack.examplePollingProvider.apiKey.keyArn,
				keyId: providerNestedStack.examplePollingProvider.apiKey.keyId,
				secret: providersConfig.ExamplePollingProvider.apiKeySecretName,
			},
			{
				keyArn: providerNestedStack.exampleWebhookProvider.apiKey.keyArn,
				keyId: providerNestedStack.exampleWebhookProvider.apiKey.keyId,
				secret: providersConfig.ExampleWebhookProvider.apiKeySecretName,
			},
			{
				keyArn: providerNestedStack.internalWebhookProvider.apiKey.keyArn,
				keyId: providerNestedStack.internalWebhookProvider.apiKey.keyId,
				secret: providersConfig.InternalWebhookProvider.apiKeySecretName,
			},
		]

		if (additionalApiConfig !== undefined) {
			apiKeySecretNameList = apiKeySecretNameList.concat(additionalApiConfig)
		}

		const providerSetup = new ProviderInitialSetup(this, 'ProviderSetup', {
			apiKeySecretNameList,
		})
	}
}
