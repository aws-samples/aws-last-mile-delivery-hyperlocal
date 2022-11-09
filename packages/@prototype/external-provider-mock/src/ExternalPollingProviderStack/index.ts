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
import { aws_apigateway as apigw, aws_ssm as ssm } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { DefaultWaf } from '@prototype/common'
import { RestApi } from '@aws-play/cdk-apigateway'
import { ExternalPollingDataStack } from './DataStack'
import { ExternalPollingServiceLambda } from './ServiceLambda'

export interface ExternalPollingProviderStackProps {
	readonly apiUrlParameterStoreKey: string
	readonly providerName: string
}

export class ExternalPollingProviderStack extends Construct {
	readonly apiKey: apigw.IApiKey

	constructor (scope: Construct, id: string, props: ExternalPollingProviderStackProps) {
		super(scope, id)

		const { apiUrlParameterStoreKey, providerName } = props

		const dataStack = new ExternalPollingDataStack(this, 'ExternalPollingData', {})
		const serviceLambda = new ExternalPollingServiceLambda(this, 'ExternalPollingServiceLambda', {
			dependencies: {
				externalOrderTable: dataStack.externalOrderTable,
			},
		})

		// create RestApi instance here, re-use everywhere else
		// also allow CORS
		const externalProviderApi = new RestApi(this, 'ExternalPollingProviderApi', {
			restApiName: namespaced(this, 'ExternalPollingProviderApi'),
			defaultCorsPreflightOptions: {
				allowOrigins: apigw.Cors.ALL_ORIGINS,
				allowMethods: apigw.Cors.ALL_METHODS,
			},
		})
		new DefaultWaf(this, 'ExternalPollingProviderApiWaf', {
			resourceArn: externalProviderApi.deploymentStage.stageArn,
		})

		this.apiKey = externalProviderApi.addApiKeyWithUsagePlanAndStage('ApiKey-ExternalPolling')

		new ssm.StringParameter(this, `ApiUrlParam-${providerName}`, {
			parameterName: apiUrlParameterStoreKey,
			stringValue: externalProviderApi.url,
			type: ssm.ParameterType.STRING,
		})

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
