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
import { aws_wafv2 as wafv2 } from 'aws-cdk-lib'
import { Construct } from 'constructs'

const CLOUDFRONT_SCOPE = 'CLOUDFRONT'

export interface CloudFrontWebAclProps {
	readonly name: string
	readonly rulesToAdd: wafv2.CfnWebACL.RuleProperty[]
}

/**
 * This construct creates a WAFv2 Web ACL for cloudfront in the us-east-1 region (required for cloudfront) no matter the
 * region of the parent cloudformation/cdk stack.
 */
export class CloudFrontWebAcl extends Construct {
	public readonly webAclArn: string

	constructor (scope: Construct, id: string, props: CloudFrontWebAclProps) {
		super(scope, id)

		const { name, rulesToAdd } = props

		const cfnWebACL = new wafv2.CfnWebACL(this, 'WebACL', {
			name,
			defaultAction: { allow: {} },
			scope: CLOUDFRONT_SCOPE,
			visibilityConfig: {
				cloudWatchMetricsEnabled: true,
				metricName: id,
				sampledRequestsEnabled: true,
			},
			rules: rulesToAdd,
		})

		this.webAclArn = cfnWebACL.attrArn
	}
}
