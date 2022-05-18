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
import { Stack, aws_lambda as lambda, aws_iam as iam } from 'aws-cdk-lib'

export const LambdaInsightsExecutionPolicyStatements = (): iam.PolicyStatement[] => {
	return [
		new iam.PolicyStatement({
			actions: ['logs:CreateLogGroup'],
			effect: iam.Effect.ALLOW,
			resources: ['*'],
		}),
		new iam.PolicyStatement({
			actions: [
				'logs:CreateLogStream',
				'logs:PutLogEvents',
			],
			effect: iam.Effect.ALLOW,
			resources: ['arn:aws:logs:*:*:log-group:/aws/lambda-insights:*'],
		}),
	]
}

export const LambdaInsightsLayer = (scope: Construct, id: string): lambda.LayerVersion => {
	const stack = Stack.of(scope)
	// note: the layer is deployed in a different account for some regions; eg. (HK, Cape Town, Milan, Beijing, Ningxia)
	// see: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versions.html
	// see: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versionsARM.html
	const layerArn = `arn:aws:lambda:${stack.region}:580247275435:layer:LambdaInsightsExtension-Arm64:2`

	return lambda.LayerVersion.fromLayerVersionArn(scope, id, layerArn) as lambda.LayerVersion
}
