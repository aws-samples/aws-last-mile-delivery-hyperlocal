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
import { Stack, Duration } from '@aws-cdk/core'
import '@aws-cdk/assert/jest'
import { setNamespace, namespaced } from '@aws-play/cdk-core'
import { CfnRestApi, CfnResource } from '@aws-cdk/aws-apigateway'
import { CfnRole } from '@aws-cdk/aws-iam'
import { Code, Runtime, Function as LambdaFunction, CfnFunction } from '@aws-cdk/aws-lambda'
import * as path from 'path'

describe('@aws-play/cdk-play-apigateway/RestApi/addFunctionToResource', () => {
	test('addFunctionToResource function is defined', () => {
		const stack = new Stack()
		const restApi = new RestApi(stack, 'TestRestApi', {})
		expect(restApi.addFunctionToResource).toBeDefined()
	})

	test('lambda fn is added to endpoint', () => {
		const stack = new Stack()
		const namespace = 'TestNamespace'
		setNamespace(stack, namespace)

		const restApi = new RestApi(stack, 'RestApi', {
			restApiName: 'TestRestApi',
		})

		const functionId = 'TestFunctionId'
		const functionName = namespaced(stack, 'TestFunctionName')
		const httpMethod = 'GET'
		const description = 'Test description'
		const timeout = 10

		const endpoint = restApi.addResourceWithAbsolutePath('/test')

		const lambdaFn = new LambdaFunction(stack, functionId, {
			code: Code.fromAsset(path.join(__dirname, 'lambda-test')),
			functionName,
			runtime: Runtime.NODEJS_12_X,
			handler: 'index.handler',
			description,
			timeout: Duration.seconds(timeout),
			environment: {
				TESTKEY: 'TestValue',
			},
		})

		restApi.addFunctionToResource(endpoint, {
			httpMethod,
			function: lambdaFn,
		})

		const restApiRefId = stack.getLogicalId(restApi.node.defaultChild as CfnRestApi)
		const endpointRefId = stack.getLogicalId(endpoint.node.defaultChild as CfnResource)
		const lambdaFnRefId = stack.getLogicalId(lambdaFn.node.defaultChild as CfnFunction)
		const roleRefId = lambdaFn.role ? stack.getLogicalId(lambdaFn.role.node.defaultChild as CfnRole) : 'dummy'

		expect(stack).toHaveResource('AWS::ApiGateway::Method', {
			RestApiId: {
				Ref: restApiRefId,
			},
			ResourceId: {
				Ref: endpointRefId,
			},
			HttpMethod: httpMethod,
			AuthorizationType: 'NONE',
			Integration: {
				IntegrationHttpMethod: 'POST',
				Type: 'AWS_PROXY',
				Uri: {
					'Fn::Join': [
						'',
						[
							'arn:',
							{
								Ref: 'AWS::Partition',
							},
							':apigateway:',
							{
								Ref: 'AWS::Region',
							},
							':lambda:path/2015-03-31/functions/',
							{
								'Fn::GetAtt': [
									lambdaFnRefId,
									'Arn',
								],
							},
							'/invocations',
						],
					],
				},
			},
		})

		expect(stack).toHaveResource('AWS::IAM::Role', {
			AssumeRolePolicyDocument: {
				Statement: [
					{
						Action: 'sts:AssumeRole',
						Effect: 'Allow',
						Principal: {
							Service: 'lambda.amazonaws.com',
						},
					},
				],
				Version: '2012-10-17',
			},
			ManagedPolicyArns: [
				{
					'Fn::Join': [
						'',
						[
							'arn:',
							{
								Ref: 'AWS::Partition',
							},
							':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
						],
					],
				},
			],
		})

		expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
			Handler: 'index.handler',
			Role: {
				'Fn::GetAtt': [
					roleRefId,
					'Arn',
				],
			},
			Runtime: Runtime.NODEJS_12_X.toString(),
			Description: description,
			Environment: {
				Variables: {
					TESTKEY: 'TestValue',
				},
			},
			FunctionName: functionName,
			Timeout: timeout,
		})
	})
})
