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
import { aws_iot as iot, aws_iam as iam, aws_lambda as lambda } from 'aws-cdk-lib'

interface IoTRuleStackProps {
  originStatusUpdateRuleName: string
  destinationStatusUpdateRuleName: string
	destinationStatusUpdateLambda: lambda.IFunction
	originStatusUpdateLambda: lambda.IFunction
}

export class IoTRuleStack extends Construct {
	public readonly iotDestinationStatusUpdateRule: iot.CfnTopicRule

	public readonly iotOriginStatusUpdateRule: iot.CfnTopicRule

	constructor (scope: Construct, id: string, props: IoTRuleStackProps) {
		super(scope, id)

		this.iotDestinationStatusUpdateRule = new iot.CfnTopicRule(this, 'IoTDestinationStatusRule', {
			ruleName: props.destinationStatusUpdateRuleName,
			topicRulePayload: {
				sql: 'SELECT *',
				ruleDisabled: false,
				actions: [{
					lambda: {
						functionArn: props.destinationStatusUpdateLambda.functionArn,
					},
				}],
			},
		})
		props.destinationStatusUpdateLambda.addPermission('AllowIoTInvoke', {
			principal: new iam.ServicePrincipal('iot.amazonaws.com'),
			sourceArn: this.iotDestinationStatusUpdateRule.attrArn,
		})

		this.iotOriginStatusUpdateRule = new iot.CfnTopicRule(this, 'IoTOriginStatusRule', {
			ruleName: props.originStatusUpdateRuleName,
			topicRulePayload: {
				sql: 'SELECT *',
				ruleDisabled: false,
				actions: [{
					lambda: {
						functionArn: props.originStatusUpdateLambda.functionArn,
					},
				}],
			},
		})
		props.originStatusUpdateLambda.addPermission('AllowIoTInvoke', {
			principal: new iam.ServicePrincipal('iot.amazonaws.com'),
			sourceArn: this.iotOriginStatusUpdateRule.attrArn,
		})
	}
}
