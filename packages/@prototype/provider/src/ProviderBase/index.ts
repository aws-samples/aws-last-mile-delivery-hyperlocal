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
import { aws_apigateway as apigw, aws_lambda as lambda, aws_wafv2 as waf } from 'aws-cdk-lib'
import { RestApi } from '@aws-play/cdk-apigateway'
import { namespaced } from '@aws-play/cdk-core'

export interface ProviderBaseProps {
	readonly name: string
	readonly providerSettings: { [key: string]: string | number | boolean, }
	readonly baseHandlers: {
		readonly requestOrderFulfillmentLambda?: lambda.IFunction
		readonly getOrderStatusLambda?: lambda.IFunction
		readonly cancelOrderLambda?: lambda.IFunction
	}
}

export class ProviderBase extends Construct {
	public readonly apiGwInstance: RestApi

	public readonly apiKey: apigw.IApiKey

	// public readonly webACL: waf.CfnWebACL

	constructor (scope: Construct, id: string, props: ProviderBaseProps) {
		super(scope, id)

		const {
			name,
			baseHandlers: {
				requestOrderFulfillmentLambda,
				getOrderStatusLambda,
				cancelOrderLambda,
			},
		} = props

		this.apiGwInstance = new RestApi(this, `ProviderApiGwInstance-${name}`, {
			restApiName: namespaced(this, `ProviderApi-${name}`),
			defaultCorsPreflightOptions: {
				allowOrigins: apigw.Cors.ALL_ORIGINS,
				allowMethods: apigw.Cors.ALL_METHODS,
			},
		})

		this.apiKey = this.apiGwInstance.addApiKeyWithUsagePlanAndStage(`ApiKey-${name}`)

		if (requestOrderFulfillmentLambda !== undefined) {
			this.addRequestOrderFulfillmentFunction(requestOrderFulfillmentLambda)
		}

		if (getOrderStatusLambda !== undefined) {
			this.addGetOrderStatusFunction(getOrderStatusLambda)
		}

		if (cancelOrderLambda !== undefined) {
			this.addCancelOrderFunction(cancelOrderLambda)
		}
	}

	public addRequestOrderFulfillmentFunction (requestOrderFulfillmentLambda: lambda.IFunction): void {
		const requestOrderFulfillmentEndpoint = this.apiGwInstance.addResourceWithAbsolutePath('request-order-fulfillment')
		this.apiGwInstance.addFunctionToResource(requestOrderFulfillmentEndpoint, {
			function: requestOrderFulfillmentLambda,
			httpMethod: 'POST',
			methodOptions: {
				apiKeyRequired: true,
			},
		})
	}

	public addGetOrderStatusFunction (getOrderStatusLambda: lambda.IFunction): void {
		const getOrderStatusEndpoint = this.apiGwInstance.addResourceWithAbsolutePath('order-status/{orderId}')
		this.apiGwInstance.addFunctionToResource(getOrderStatusEndpoint, {
			function: getOrderStatusLambda,
			httpMethod: 'GET',
			methodOptions: {
				apiKeyRequired: true,
			},
		})
	}

	public addCancelOrderFunction (cancelOrderLambda: lambda.IFunction): void {
		const cancelOrderEndpoint = this.apiGwInstance.addResourceWithAbsolutePath('cancel-order/{orderId}')
		this.apiGwInstance.addFunctionToResource(cancelOrderEndpoint, {
			function: cancelOrderLambda,
			httpMethod: 'DELETE',
			methodOptions: {
				apiKeyRequired: true,
			},
		})
	}

	/**
	 * NOT USING IT FOR NOW
	 * @param name
	 */
	private addWAF (name: string) {
		const webACL = new waf.CfnWebACL(this, `ProviderWafWebACL-${name}`, {
			name,
			description: `WebACL for ${name}`,
			defaultAction: {
				block: {

				},
			},
			scope: 'REGIONAL',
			tags: [
				{
					key: 'Name',
					value: name,
				},
				{
					key: 'environment',
					value: 'prototype',
				},
			],
			visibilityConfig: {
				cloudWatchMetricsEnabled: true,
				metricName: `waf-metric-${name}`,
				sampledRequestsEnabled: true, // TODO: review this
			},
			rules: [], // TODO: add rules
		})

		const webACLAssociation = new waf.CfnWebACLAssociation(this, `ProviderWafWebACLAssociation-${name}`, {
			resourceArn: this.apiGwInstance.restApiId,
			webAclArn: webACL.attrArn,
		})

		webACLAssociation.addDependsOn(webACL)
	}
}
