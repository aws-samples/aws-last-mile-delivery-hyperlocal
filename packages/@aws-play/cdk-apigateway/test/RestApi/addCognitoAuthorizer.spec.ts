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
import { RestApi } from '../../src'
import { Stack } from '@aws-cdk/core'
import '@aws-cdk/assert/jest'
import { setNamespace, namespaced } from '@aws-play/cdk-core'
import { CfnRestApi } from '@aws-cdk/aws-apigateway'

describe('@aws-play/cdk-play-apigateway/RestApi/addCognitoAuthorizer', () => {
	test('addCognitoAuthorizer function is defined', () => {
		const stack = new Stack()
		const restApi = new RestApi(stack, 'TestRestApi', {})
		expect(restApi.addCognitoAuthorizer).toBeDefined()
	})

	test('cognito authorizer gets created', () => {
		const stack = new Stack()
		const namespace = 'TestNamespace'
		setNamespace(stack, namespace)

		const restApi = new RestApi(stack, 'RestApi', {
			restApiName: 'TestRestApi',
		})

		const USERPOOL_ARN = 'TEST_ARN'

		restApi.addCognitoAuthorizer([USERPOOL_ARN])

		const restApiRefId = stack.getLogicalId(restApi.node.defaultChild as CfnRestApi)

		expect(stack).toHaveResource('AWS::ApiGateway::Authorizer', {
			RestApiId: {
				Ref: restApiRefId,
			},
			Type: 'COGNITO_USER_POOLS',
			IdentitySource: 'method.request.header.Authorization',
			Name: namespaced(stack, 'CognitoAuthorizer'),
			ProviderARNs: [
				USERPOOL_ARN,
			],
		})
	})
})
