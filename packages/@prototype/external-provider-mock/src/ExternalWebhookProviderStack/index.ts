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
import { aws_apigateway as apigw } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { RestApi } from '@aws-play/cdk-apigateway'
import { ExternalWebhookDataStack } from './DataStack'
import { ExternalWebhookServiceLambda } from './ServiceLambda'
import { ExternalWebhookInvokerStack } from './WebhookInvoker'

export interface ExternalWebhookProviderStackProps {
	readonly exampleWebhookApiSecretName: string
}

export class ExternalWebhookProviderStack extends Construct {
	readonly apiKey: apigw.IApiKey

	constructor (scope: Construct, id: string, props: ExternalWebhookProviderStackProps) {
		super(scope, id)

		const {
			exampleWebhookApiSecretName,
		} = props

		const dataStack = new ExternalWebhookDataStack(this, 'ExternalWebhookData', {})
		const serviceLambda = new ExternalWebhookServiceLambda(this, 'ExternalWebhookServiceLambda', {
			dependencies: {
				externalOrderTable: dataStack.externalOrderTable,
			},
		})

		new ExternalWebhookInvokerStack(this, 'ExternalWebhookInvokerStack', {
			externalOrderTable: dataStack.externalOrderTable,
			externalOrderFinalisedIndex: dataStack.externalOrderFinalisedIndex,
			exampleWebhookApiSecretName,
		})

		// create RestApi instance here, re-use everywhere else
		// also allow CORS
		const externalProviderApi = new RestApi(this, 'ExternalWebhookProviderApi', {
			restApiName: namespaced(this, 'ExternalWebhookProviderApi'),
			defaultCorsPreflightOptions: {
				allowOrigins: apigw.Cors.ALL_ORIGINS,
				allowMethods: apigw.Cors.ALL_METHODS,
			},
		})

		this.apiKey = externalProviderApi.addApiKeyWithUsagePlanAndStage('ApiKey-ExternalWebhook')

		const createOrder = externalProviderApi.addResourceWithAbsolutePath('order')
		externalProviderApi.addFunctionToResource(createOrder, {
			function: serviceLambda,
			httpMethod: 'POST',
			methodOptions: {
				apiKeyRequired: true,
			},
		})

		const getOrder = externalProviderApi.addResourceWithAbsolutePath('order/{orderId}')
		externalProviderApi.addFunctionToResource(getOrder, {
			function: serviceLambda,
			httpMethod: 'GET',
			methodOptions: {
				apiKeyRequired: true,
			},
		})

		const cancel = externalProviderApi.addResourceWithAbsolutePath('order/{orderId}')
		externalProviderApi.addFunctionToResource(cancel, {
			function: serviceLambda,
			httpMethod: 'DELETE',
			methodOptions: {
				apiKeyRequired: true,
			},
		})
	}
}
