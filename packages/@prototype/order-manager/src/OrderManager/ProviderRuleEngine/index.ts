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
import { Duration, aws_lambda as lambda, aws_dynamodb as ddb, aws_iam as iam, aws_apigateway as apigw, aws_secretsmanager as secretsmanager } from 'aws-cdk-lib'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { LambdaInsightsExecutionPolicyStatements } from '@prototype/lambda-common'

interface Environment extends DeclaredLambdaEnvironment {
	PROVIDERS: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly demographicAreaProviderEngineSettings: ddb.ITable
	readonly providersConfig: { [key: string]: any, }
	readonly providerApiUrls: Record<string, string>
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class ProviderRuleEngineLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			providersConfig,
			providerApiUrls,
			demographicAreaProviderEngineSettings,
		} = props.dependencies

		const pollingProviderSecret = secretsmanager.Secret.fromSecretNameV2(scope, 'PollingProviderSecret', providersConfig.ExamplePollingProvider.apiKeySecretName)
		const webhookProviderSecret = secretsmanager.Secret.fromSecretNameV2(scope, 'WebhookProviderSecret', providersConfig.ExampleWebhookProvider.apiKeySecretName)
		const instantDeliveryProviderSecret = secretsmanager.Secret.fromSecretNameV2(scope, 'InstantDeliverySecret', providersConfig.InstantDeliveryProvider.apiKeySecretName)
		const sameDayDeliveryProviderSecret = secretsmanager.Secret.fromSecretNameV2(scope, 'SameDayDeliverySecret', providersConfig.SameDayDeliveryProvider.apiKeySecretName)

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'ProviderRuleEngineLambda'),
			description: 'Lambda implementation of the provider rule engine',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/provider-rule-engine.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(120),
			environment: {
				PROVIDERS: Object.keys(providersConfig).join(','),
				DEMOGRAPHIC_AREA_SETTINGS_TABLE: demographicAreaProviderEngineSettings.tableName,
				EXAMPLE_POLLING_PROVIDER_SECRET_NAME: providersConfig.ExamplePollingProvider.apiKeySecretName,
				EXAMPLE_POLLING_PROVIDER_URL: providerApiUrls.ExamplePollingProvider,
				EXAMPLE_WEBHOOK_PROVIDER_SECRET_NAME: providersConfig.ExampleWebhookProvider.apiKeySecretName,
				EXAMPLE_WEBHOOK_PROVIDER_URL: providerApiUrls.ExampleWebhookProvider,
				INSTANT_DELIVERY_PROVIDER_SECRET_NAME: providersConfig.InstantDeliveryProvider.apiKeySecretName,
				INSTANT_DELIVERY_PROVIDER_URL: providerApiUrls.InstantDeliveryProvider,
				SAME_DAY_DELIVERY_PROVIDER_SECRET_NAME: providersConfig.SameDayDeliveryProvider.apiKeySecretName,
				SAME_DAY_DELIVERY_PROVIDER_URL: providerApiUrls.SameDayDeliveryProvider,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'dynamodb:GetItem',
						'dynamodb:Scan',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						demographicAreaProviderEngineSettings.tableArn,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'secretsmanager:GetSecretValue',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						`${pollingProviderSecret.secretArn}*`,
						`${webhookProviderSecret.secretArn}*`,
						`${instantDeliveryProviderSecret.secretArn}*`,
						`${sameDayDeliveryProviderSecret.secretArn}*`,
					],
				}),
				...LambdaInsightsExecutionPolicyStatements(),
			],
		}

		super(scope, id, declaredProps)
	}
}
