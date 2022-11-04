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
import { Stack, StackProps, custom_resources as cr } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { CloudFrontWebAcl } from '@aws-play/cdk-web'

export interface CloudFrontWebACLStackProps extends StackProps {
	readonly webAclName: string
	readonly webAclArnParameterStoreKey: string
	readonly ssmParamRegion: string
}

/**
 * Root level stack that creates a CLOUDFRONT scoped WebACL
 */
export class CloudFrontWebACLStack extends Stack {
	constructor (scope: Construct, id: string, props: CloudFrontWebACLStackProps) {
		super(scope, id, props)

		// this is a CLOUDFRONT webACL which requires to be in us-east-1 region
		// see: https://docs.aws.amazon.com/waf/latest/APIReference/API_CreateWebACL.html#API_CreateWebACL_RequestSyntax
		if (this.region !== 'us-east-1') {
			throw new Error('CLOUDFRONT webACL must be deployed in us-east-1 region')
		}
		const { ssmParamRegion, webAclName, webAclArnParameterStoreKey } = props

		// Web ACL
		const cloudFrontWebAcl = new CloudFrontWebAcl(this, 'WebACL', {
			name: webAclName,
			rulesToAdd: [
				{
					name: 'AWS-AWSManagedRulesCommonRuleSet',
					priority: 0,
					statement: {
						managedRuleGroupStatement: {
							name: 'AWSManagedRulesCommonRuleSet',
							excludedRules: [],
							vendorName: 'AWS',
						},
					},
					overrideAction: { none: {} },
					visibilityConfig: {
						metricName: 'AWS-AWSManagedRulesCommonRuleSet',
						cloudWatchMetricsEnabled: true,
						sampledRequestsEnabled: true,
					},
				},
				{
					name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
					priority: 1,
					statement: {
						managedRuleGroupStatement: {
							name: 'AWSManagedRulesKnownBadInputsRuleSet',
							excludedRules: [],
							vendorName: 'AWS',
						},
					},
					overrideAction: { none: {} },
					visibilityConfig: {
						metricName: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
						cloudWatchMetricsEnabled: true,
						sampledRequestsEnabled: true,
					},
				},
			],
		})

		// Add the WebACL's ARN to SSM Parameter store in the region the CloudFront distro
		// will be added, so the association can be made to it.
		// this is quite a hack, but well, CLOUDFRONT webACLs can be only created in us-east-1 🤷‍♂️
		new cr.AwsCustomResource(this, 'storeWafArnInSSMParamInRegion', {
			policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
				resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
			onCreate: {
				service: 'SSM',
				action: 'putParameter',
				parameters: {
					Name: webAclArnParameterStoreKey,
					Value: cloudFrontWebAcl.webAclArn,
					Type: 'String',
				},
				region: ssmParamRegion,
				physicalResourceId: cr.PhysicalResourceId.of('storeWafArnInSSMParamInRegionCreate'),
			},
			onDelete: {
				service: 'SSM',
				action: 'deleteParameter',
				parameters: {
					Name: webAclArnParameterStoreKey,
				},
				region: ssmParamRegion,
				physicalResourceId: cr.PhysicalResourceId.of('storeWafArnInSSMParamInRegionDelete'),
			},
		})
	}
}
