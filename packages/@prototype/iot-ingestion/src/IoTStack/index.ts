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
import { Stack, CfnOutput, aws_iot as iot, aws_iam as iam, aws_lambda as lambda, aws_kinesis as kinesis } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'

interface IoTStackProps {
	driverDataIngestStream: kinesis.IStream
	driverStatusUpdateLambda: lambda.IFunction
	cognitoAuthenticatedRole: iam.IRole
}

export class IoTStack extends Construct {
	public readonly iotDriverDataIngestRule: iot.CfnTopicRule

	public readonly iotDriverStatusUpdateRule: iot.CfnTopicRule

	public readonly iotDriverPolicy: iot.CfnPolicy

	constructor (scope: Construct, id: string, props: IoTStackProps) {
		super(scope, id)
		const stack = Stack.of(this)

		const iotToDriverDataIngestStreamRole = new iam.Role(this, 'IotToDriverDataIngestStream', {
			roleName: namespaced(this, 'iot-rule-to-driver-data-ingest'),
			assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
		})
		iotToDriverDataIngestStreamRole.addToPolicy(new iam.PolicyStatement({
			resources: [props.driverDataIngestStream.streamArn],
			actions: ['kinesis:PutRecord'],
			effect: iam.Effect.ALLOW,
		}))

		const driverDataIngestRuleName = namespaced(this, 'driver_data_ingest', { delimiter: '_' })
		this.iotDriverDataIngestRule = new iot.CfnTopicRule(this, 'DriverDataIoTIngestRule', {
			ruleName: driverDataIngestRuleName,
			topicRulePayload: {
				sql: 'SELECT *',
				ruleDisabled: false,
				actions: [{
					kinesis: {
						streamName: props.driverDataIngestStream.streamName,
						// eslint-disable-next-line no-template-curly-in-string
						partitionKey: '${newuuid()}',
						roleArn: iotToDriverDataIngestStreamRole.roleArn,
					},
				}],
			},
		})

		const driverStatusUpdateRuleName = namespaced(this, 'driver_status_update', { delimiter: '_' })
		this.iotDriverStatusUpdateRule = new iot.CfnTopicRule(this, 'IoTDriverStatusRule', {
			ruleName: driverStatusUpdateRuleName,
			topicRulePayload: {
				sql: 'SELECT *',
				ruleDisabled: false,
				actions: [{
					lambda: {
						functionArn: props.driverStatusUpdateLambda.functionArn,
					},
				}],
			},
		})
		props.driverStatusUpdateLambda.addPermission('AllowIoTInvoke', {
			principal: new iam.ServicePrincipal('iot.amazonaws.com'),
			sourceArn: this.iotDriverStatusUpdateRule.attrArn,
		})

		const prefix = `arn:aws:iot:${stack.region}:${stack.account}`

		this.iotDriverPolicy = new iot.CfnPolicy(this, 'IoTDriverPolicy', {
			policyName: namespaced(this, 'driver_policy2', { delimiter: '_' }),
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
						Resource: prefix + `:topic/$aws/rules/${driverDataIngestRuleName}`,
					},
					{
						Effect: 'Allow',
						Action: 'iot:Publish',
						Resource: prefix + `:topic/$aws/rules/${driverStatusUpdateRuleName}`,
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

		props.cognitoAuthenticatedRole.attachInlinePolicy(new iam.Policy(this, 'RestrictedIoTActionsPolicy', {
			document: new iam.PolicyDocument({
				statements: [
					new iam.PolicyStatement({
						effect: iam.Effect.ALLOW,
						actions: [
							'iot:Connect',
						],
						resources: [
							prefix + ':client/${cognito-identity.amazonaws.com:sub}*',
						],
					}),
					new iam.PolicyStatement({
						effect: iam.Effect.ALLOW,
						actions: [
							'iot:Subscribe',
						],
						resources: [
							prefix + ':topicfilter/${cognito-identity.amazonaws.com:sub}/messages',
							prefix + ':topicfilter/broadcast',
						],
					}),
					new iam.PolicyStatement({
						effect: iam.Effect.ALLOW,
						actions: [
							'iot:Receive',
						],
						resources: [
							prefix + ':topic/${cognito-identity.amazonaws.com:sub}/messages',
							prefix + ':topic/broadcast',
						],
					}),
					new iam.PolicyStatement({
						effect: iam.Effect.ALLOW,
						actions: [
							'iot:Publish',
						],
						resources: [
							prefix + `:topic/$aws/rules/${driverDataIngestRuleName}`,
							prefix + `:topic/$aws/rules/${driverStatusUpdateRuleName}`,
						],
					}),
				],
			}),
			policyName: namespaced(this, 'RestrictedIoTActionsPolicy'),
		}))

		new CfnOutput(this, 'IoTPolicyName', {
			exportName: 'IoTGenericPolicyName',
			value: this.iotDriverPolicy.policyName || '',
		})
	}
}
