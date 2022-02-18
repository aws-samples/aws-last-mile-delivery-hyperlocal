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
import { aws_wafv2 as waf } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'

export interface DefaultWafProps {
  readonly resourceArn: string
}

export class DefaultWaf extends Construct {
	constructor (scope: Construct, id: string, props: DefaultWafProps) {
		super(scope, id)

		const { resourceArn } = props

		const wafRules: waf.CfnWebACL.RuleProperty[] = []
		const rulesToAdd = [
			{
				name: 'AWSManagedRulesCommonRuleSet',
				excludedRules: [{ name: 'SizeRestrictions_BODY' }],
				metricName: 'awsCommonRules',
			},
			{ name: 'AWSManagedRulesAmazonIpReputationList', excludedRules: [], metricName: 'awsReputation' },
			{ name: 'AWSManagedRulesKnownBadInputsRuleSet', excludedRules: [], metricName: 'awsBadInput' },
		]

		for (let i = 0; i < rulesToAdd.length; i++) {
			const rule = rulesToAdd[i]

			const wafRule: waf.CfnWebACL.RuleProperty = {
				name: `AWS-${rule.name}`,
				priority: i + 1,
				overrideAction: { none: {} },
				statement: {
					managedRuleGroupStatement: {
						name: rule.name,
						vendorName: 'AWS',
						excludedRules: rule.excludedRules,
					},
				},
				visibilityConfig: {
					cloudWatchMetricsEnabled: true,
					metricName: rule.metricName,
					sampledRequestsEnabled: true,
				},
			}

			wafRules.push(wafRule)
		}

		const webACL = new waf.CfnWebACL(this, 'ApiGatewayWebACL', {
			name: namespaced(this, `${this.node.id}-DefaultWaf`),
			defaultAction: {
				allow: {},
			},
			scope: 'REGIONAL',
			visibilityConfig: {
				cloudWatchMetricsEnabled: true,
				metricName: 'webACL',
				sampledRequestsEnabled: true,
			},
			rules: wafRules,
		})

		// Associate with our gateway
		new waf.CfnWebACLAssociation(this, 'DefaultWafWebACLAssociation', {
			webAclArn: webACL.attrArn,
			resourceArn,
		})
	}
}
