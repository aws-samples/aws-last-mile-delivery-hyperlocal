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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { RestApi } from '../../src'
import { Stack, Duration } from '@aws-cdk/core'
// eslint-disable-next-line import/no-extraneous-dependencies
import '@aws-cdk/assert/jest'
import { setNamespace, namespaced } from '@aws-play/cdk-core'
import { CfnRestApi, CfnResource } from '@aws-cdk/aws-apigateway'
import { CfnRole } from '@aws-cdk/aws-iam'
import { Code, Runtime, CfnFunction } from '@aws-cdk/aws-lambda'
import * as path from 'path'

describe('@aws-play/cdk-play-apigateway/RestApi/createLambdaFunctionToResource', () => {
	test('createLambdaFunctionToResource function is defined', () => {
		const stack = new Stack()
		const restApi = new RestApi(stack, 'TestRestApi', {})
		expect(restApi.createLambdaFunctionToResource).toBeDefined()
	})

	test('lambda fn with execution role gets created', () => {
		const stack = new Stack()
		const namespace = 'TestNamespace'
		setNamespace(stack, namespace)

		const restApi = new RestApi(stack, 'RestApi', {
			restApiName: 'TestRestApi',
		})

		const functionId = 'TestFunctionId'
		const functionName = 'TestFunctionName'
		const httpMethod = 'GET'
		const description = 'Test description'
		const timeout = 10

		const endpoint = restApi.addResourceWithAbsolutePath('/test')

		const lambdaFn = restApi.createLambdaFunctionToResource(endpoint, {
			functionId,
			httpMethod,
			functionProps: {
				code: Code.fromAsset(path.join(__dirname, 'lambda-test')),
				functionName,
				runtime: Runtime.NODEJS_12_X,
				handler: 'index.handler',
				description,
				timeout: Duration.seconds(timeout),
				environment: {
					TESTKEY: 'TestValue',
				},
			},
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
			Description: `Execution role for ${functionName}`,
			ManagedPolicyArns: [
				{
					'Fn::Join': [
						'',
						[
							'arn:',
							{
								Ref: 'AWS::Partition',
							},
							':iam::aws:policy/AWSLambdaExecute',
						],
					],
				},
			],
			RoleName: namespaced(stack, functionName),
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
			FunctionName: namespaced(stack, functionName),
			Timeout: timeout,
		})
	})
})
