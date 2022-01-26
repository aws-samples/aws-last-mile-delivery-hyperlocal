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
import * as events from '@aws-cdk/aws-events'
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from '@aws-cdk/custom-resources'
import { WebhookProviderBase } from '@prototype/provider'
import { CfnCacheCluster } from '@aws-cdk/aws-elasticache'
import { VpcLambdaProps } from '@prototype/lambda-common'
import { ExampleCallbackLambda } from './lambdas/ExampleCallback'
import { RequestOrderFulfillmentLambda } from './lambdas/RequestOrderFulfillment'
import { CancelOrderLambda } from './lambdas/CancelOrder'
import { GetOrderStatusLambda } from './lambdas/GetOrderStatus'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ExampleWebhookProviderProps extends VpcLambdaProps {
	readonly webhookProviderSettings: { [key: string]: string | number, }
	readonly eventBus: events.IEventBus
	readonly redisCluster: CfnCacheCluster
	readonly externalProviderMockUrl: string
	readonly externalProviderSecretName: string
}

export class ExampleWebhookProvider extends WebhookProviderBase {
	constructor (scope: cdk.Construct, id: string, props: ExampleWebhookProviderProps) {
		const {
			webhookProviderSettings,
			eventBus,
			vpc,
			lambdaSecurityGroups,
			layers,
			externalProviderMockUrl,
			externalProviderSecretName,
			redisCluster,
		} = props

		const callbackLambdaHandler = new ExampleCallbackLambda(scope, 'WebhookProvider-ExampleCallbackLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer, layers.redisClientLayer],
				redisCluster,
			},
		})

		const requestOrderFulfillmentLambda = new RequestOrderFulfillmentLambda(scope, 'ExampleWebhookProvider-RequestOrderFulfillmentLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer, layers.redisClientLayer],
				externalProviderMockUrl,
				externalProviderSecretName,
				redisCluster,
			},
		})

		const getOrderStatusLambda = new GetOrderStatusLambda(scope, 'ExampleWebhookProvider-GetOrderStatusLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer, layers.redisClientLayer],
				externalProviderMockUrl,
				externalProviderSecretName,
				redisCluster,
			},
		})

		const cancelOrderLambda = new CancelOrderLambda(scope, 'ExampleWebhookProvider-CancelOrderLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer, layers.redisClientLayer],
				externalProviderMockUrl,
				externalProviderSecretName,
				redisCluster,
			},
		})

		super(scope, id, {
			name: 'ExampleWebhookProvider',
			providerSettings: webhookProviderSettings,
			baseHandlers: {
				getOrderStatusLambda,
				cancelOrderLambda,
				requestOrderFulfillmentLambda,
			},
			callback: {
				httpMethod: 'POST',
				lambdaHandler: callbackLambdaHandler,
				resourcePath: '/callback',
			},
		})

		const action = {
			service: 'Lambda',
			action: 'updateFunctionConfiguration',
			parameters: {
				FunctionName: requestOrderFulfillmentLambda.functionArn,
				Environment: {
					Variables: {
						/// needed to avoid that env will get fully replaced with only the additional one
						...requestOrderFulfillmentLambda.environmentVariables,
						API_BASE_URL: this.apiGwInstance.url,
					},
				},
			},
			physicalResourceId: PhysicalResourceId.fromResponse('FunctionName'),
		}

		/// to fix circular dependency: this updates the configuration of the lambda function utilised
		/// to set the API gateway URL
		// temporary fix with Date.now() to force resource redeployment
		new AwsCustomResource(this, `WebhookProviderLambdaConfigurationResource-${Date.now().toString(36)}`, {
			onCreate: action,
			onUpdate: action,
			policy: AwsCustomResourcePolicy.fromSdkCalls({
				resources: AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
		})
	}
}
