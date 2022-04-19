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
import {
	aws_apigateway as apigw,
	aws_lambda as lambda,
	aws_lambda_nodejs as lambda_nodejs,
} from 'aws-cdk-lib'
import { namespaced, uniqueIdHash } from '@aws-play/cdk-core'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RestApiProps extends apigw.RestApiProps {}

interface BaseFunctionToResourceProps {
	httpMethod: string
	methodOptions?: apigw.MethodOptions
}

export interface CreateFunctionToResourceProps extends BaseFunctionToResourceProps{
	functionId: string
	functionProps: lambda.FunctionProps | lambda_nodejs.NodejsFunctionProps
}

export interface AddFunctionToResourceProps extends BaseFunctionToResourceProps {
	function: lambda.IFunction
}

export class RestApi extends apigw.RestApi {
	private static defaultProps ({ endpointTypes, ...props }: RestApiProps): RestApiProps {
		return {
			...props,
			endpointTypes: endpointTypes || [apigw.EndpointType.REGIONAL],
		}
	}

	constructor (scope: Construct, id: string, props: RestApiProps) {
		super(scope, id, RestApi.defaultProps(props))

		let { restApiName } = props

		if (!restApiName) {
			restApiName = `restApi-${uniqueIdHash(this)}`
		}
	}

	addApiKeyWithUsagePlanAndStage (apiKeyId: string, usagePlanName?: string): apigw.IApiKey {
		const _usagePlanName = usagePlanName || `${apiKeyId}-usagePlan`

		// create the api key
		const apiKey = this.addApiKey(`${apiKeyId}-${uniqueIdHash(this)}`, {
			apiKeyName: namespaced(this, apiKeyId),
		})

		// usage plan
		const usagePlan = this.addUsagePlan(`${apiKeyId}-usagePlan`, {
			name: _usagePlanName,
		})
		usagePlan.addApiKey(apiKey)

		// stage
		usagePlan.addApiStage({ api: this, stage: this.deploymentStage })

		return apiKey
	}

	addResourceWithAbsolutePath (path: string): apigw.IResource {
		return this.root.resourceForPath(path)
	}

	addCognitoAuthorizer (providerArns: string[]): apigw.CfnAuthorizer {
		// add cognito authorizer
		const cognitoAuthorizer = new apigw.CfnAuthorizer(this, `CognitoAuthorizer-${uniqueIdHash(this)}`, {
			name: namespaced(this, 'CognitoAuthorizer'),
			identitySource: 'method.request.header.Authorization',
			providerArns,
			restApiId: this.restApiId,
			type: apigw.AuthorizationType.COGNITO,
		})

		return cognitoAuthorizer
	}

	addFunctionToResource (resource: apigw.IResource, props: AddFunctionToResourceProps): void {
		const { httpMethod, methodOptions, function: lambdaFunction } = props

		const lambdaIntegration = new apigw.LambdaIntegration(lambdaFunction)
		resource.addMethod(httpMethod, lambdaIntegration, methodOptions)
	}
}
