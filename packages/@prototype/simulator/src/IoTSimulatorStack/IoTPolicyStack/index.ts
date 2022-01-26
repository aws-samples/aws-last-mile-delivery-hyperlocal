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
import * as cdk from '@aws-cdk/core'
import * as iot from '@aws-cdk/aws-iot'
import * as iam from '@aws-cdk/aws-iam'
import { namespaced } from '@aws-play/cdk-core'

interface IoTPolicyStackProps {
	cognitoAuthenticatedRole: iam.IRole
}

export class IoTPolicyStack extends cdk.Construct {
	public readonly customerStatusUpdateRuleName: string

	public readonly restaurantStatusUpdateRuleName: string

	public readonly iotCustomerPolicy: iot.CfnPolicy

	public readonly iotRestaurantPolicy: iot.CfnPolicy

	constructor (scope: cdk.Construct, id: string, props: IoTPolicyStackProps) {
		super(scope, id)
		const stack = cdk.Stack.of(this)

		this.customerStatusUpdateRuleName = namespaced(this, 'customer_status_update', { delimiter: '_' })

		this.restaurantStatusUpdateRuleName = namespaced(this, 'restaurant_status_update', { delimiter: '_' })

		const prefix = `arn:aws:iot:${stack.region}:${stack.account}`

		this.iotCustomerPolicy = new iot.CfnPolicy(this, 'IoTCustomerPolicy', {
			policyName: namespaced(this, 'customer_policy', { delimiter: '_' }),
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
						Resource: prefix + `:topic/$aws/rules/${this.customerStatusUpdateRuleName}`,
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

		this.iotRestaurantPolicy = new iot.CfnPolicy(this, 'IoTRestaurantPolicy', {
			policyName: namespaced(this, 'restaurant_policy', { delimiter: '_' }),
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
						Resource: prefix + `:topic/$aws/rules/${this.restaurantStatusUpdateRuleName}`,
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

		props.cognitoAuthenticatedRole.attachInlinePolicy(new iam.Policy(this, 'CustomerRestaurantPolicy', {
			document: new iam.PolicyDocument({
				statements: [
					new iam.PolicyStatement({
						effect: iam.Effect.ALLOW,
						actions: [
							'iot:Publish',
						],
						resources: [
							prefix + `:topic/$aws/rules/${this.customerStatusUpdateRuleName}`,
							prefix + `:topic/$aws/rules/${this.restaurantStatusUpdateRuleName}`,
						],
					}),
				],
			}),
			policyName: namespaced(this, 'CustomerRestaurantPolicy'),
		}))
	}
}
