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
import { NestedStack, NestedStackProps, aws_ec2 as ec2, aws_lambda as lambda } from 'aws-cdk-lib'
import { ESInitialSetup } from '@prototype/live-data-cache'
import { ProviderInitialSetup } from '@prototype/provider'
import { ProviderStack } from '../ProviderStack'
import { Networking } from '@prototype/networking'

export interface ApiKeySecretConfigItem {
	keyArn: string
	keyId: string
	secret: string
}
export interface CustomResourcesStackProps extends NestedStackProps {
	readonly vpc: ec2.IVpc
	readonly vpcNetworking: Networking
	readonly lambdaRefs: { [key: string]: lambda.IFunction, }
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
				keyArn: providerNestedStack.instantDeliveryWebhookProvider.apiKey.keyArn,
				keyId: providerNestedStack.instantDeliveryWebhookProvider.apiKey.keyId,
				secret: providersConfig.InstantDeliveryProvider.apiKeySecretName,
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
