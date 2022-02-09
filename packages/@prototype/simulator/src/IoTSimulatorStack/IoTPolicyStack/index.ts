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
/* eslint-disable no-template-curly-in-string */
import { Construct } from 'constructs'
import { Stack, aws_iot as iot, aws_iam as iam } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'

interface IoTPolicyStackProps {
	cognitoAuthenticatedRole: iam.IRole
}

export class IoTPolicyStack extends Construct {
	public readonly destinationStatusUpdateRuleName: string

	public readonly originStatusUpdateRuleName: string

	public readonly iotDestinationPolicy: iot.CfnPolicy

	public readonly iotOriginPolicy: iot.CfnPolicy

	constructor (scope: Construct, id: string, props: IoTPolicyStackProps) {
		super(scope, id)
		const stack = Stack.of(this)

		this.destinationStatusUpdateRuleName = namespaced(this, 'destination_status_update', { delimiter: '_' })

		this.originStatusUpdateRuleName = namespaced(this, 'origin_status_update', { delimiter: '_' })

		const prefix = `arn:aws:iot:${stack.region}:${stack.account}`

		this.iotDestinationPolicy = new iot.CfnPolicy(this, 'IoTDestinationPolicy', {
			policyName: namespaced(this, 'destination_policy', { delimiter: '_' }),
			policyDocument: {
				Version: '2012-10-17',
				Statement: [
					{
						Effect: 'Allow',
						Action: 'iot:Connect',
						Resource: prefix + ':client/${cognito-identity.amazonaws.com:sub}*',
					},
					{
						Effect: 'Allow',
						Action: 'iot:Publish',
						Resource: prefix + `:topic/$aws/rules/${this.destinationStatusUpdateRuleName}`,
					},
					{
						Effect: 'Allow',
						Action: 'iot:Subscribe',
						Resource: prefix + ':topicfilter/${cognito-identity.amazonaws.com:sub}/messages',
					},
					{
						Effect: 'Allow',
						Action: 'iot:Receive',
						Resource: prefix + ':topic/${cognito-identity.amazonaws.com:sub}/messages',
					},
					{
						Effect: 'Allow',
						Action: 'iot:Subscribe',
						Resource: prefix + ':topicfilter/broadcast',
					},
					{
						Effect: 'Allow',
						Action: 'iot:Receive',
						Resource: prefix + ':topic/broadcast',
					},
				],
			},
		})

		this.iotOriginPolicy = new iot.CfnPolicy(this, 'IoTOriginPolicy', {
			policyName: namespaced(this, 'origin_policy', { delimiter: '_' }),
			policyDocument: {
				Version: '2012-10-17',
				Statement: [
					{
						Effect: 'Allow',
						Action: 'iot:Connect',
						Resource: prefix + ':client/${cognito-identity.amazonaws.com:sub}*',
					},
					{
						Effect: 'Allow',
						Action: 'iot:Publish',
						Resource: prefix + `:topic/$aws/rules/${this.originStatusUpdateRuleName}`,
					},
					{
						Effect: 'Allow',
						Action: 'iot:Subscribe',
						Resource: prefix + ':topicfilter/${cognito-identity.amazonaws.com:sub}/messages',
					},
					{
						Effect: 'Allow',
						Action: 'iot:Receive',
						Resource: prefix + ':topic/${cognito-identity.amazonaws.com:sub}/messages',
					},
					{
						Effect: 'Allow',
						Action: 'iot:Subscribe',
						Resource: prefix + ':topicfilter/broadcast',
					},
					{
						Effect: 'Allow',
						Action: 'iot:Receive',
						Resource: prefix + ':topic/broadcast',
					},
				],
			},
		})

		props.cognitoAuthenticatedRole.attachInlinePolicy(new iam.Policy(this, 'destinationoriginPolicy', {
			document: new iam.PolicyDocument({
				statements: [
					new iam.PolicyStatement({
						effect: iam.Effect.ALLOW,
						actions: [
							'iot:Publish',
						],
						resources: [
							prefix + `:topic/$aws/rules/${this.destinationStatusUpdateRuleName}`,
							prefix + `:topic/$aws/rules/${this.originStatusUpdateRuleName}`,
						],
					}),
				],
			}),
			policyName: namespaced(this, 'destinationoriginPolicy'),
		}))
	}
}
