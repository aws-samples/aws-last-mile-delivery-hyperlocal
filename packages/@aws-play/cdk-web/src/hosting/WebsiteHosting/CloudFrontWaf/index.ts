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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { WAFV2 } from 'aws-sdk'
import { custom_resources as cr } from 'aws-cdk-lib'
import { Construct } from 'constructs'

export interface CloudFrontWebAclProps {
	readonly name: string
	readonly suffix: string
	readonly managedRules: WAFV2.ManagedRuleGroupStatement[]
}

/**
 * This construct creates a WAFv2 Web ACL for cloudfront in the us-east-1 region (required for cloudfront) no matter the
 * region of the parent cloudformation/cdk stack.
 */
export default class CloudFrontWebAcl extends Construct {
	public readonly webAclId: string;

	public readonly name: string;

	public readonly region: string = 'us-east-1';

	constructor (scope: Construct, id: string, props: CloudFrontWebAclProps) {
		super(scope, id)

		this.name = props.name
		const Scope = 'CLOUDFRONT'

		// The parameters for creating the Web ACL
		const createWebACLRequest: WAFV2.Types.CreateWebACLRequest = {
			Name: this.name,
			DefaultAction: { Allow: {} },
			Scope,
			VisibilityConfig: {
				CloudWatchMetricsEnabled: true,
				MetricName: id,
				SampledRequestsEnabled: true,
			},
			Rules: props.managedRules.map((rule, Priority) => ({
				Name: `${rule.VendorName}-${rule.Name}`,
				Priority,
				Statement: { ManagedRuleGroupStatement: rule },
				OverrideAction: { None: {} },
				VisibilityConfig: {
					MetricName: `${rule.VendorName}-${rule.Name}`,
					CloudWatchMetricsEnabled: true,
					SampledRequestsEnabled: true,
				},
			})),
		}

		// Create the Web ACL
		const createWafCustomResource = new cr.AwsCustomResource(this, `${id}-Create`, {
			policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
				resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
			onCreate: {
				service: 'WAFV2',
				action: 'createWebACL',
				parameters: createWebACLRequest,
				region: this.region,
				physicalResourceId: cr.PhysicalResourceId.fromResponse('Summary.Id'),
			},
		})
		this.webAclId = createWafCustomResource.getResponseField('Summary.Id')

		const getWebACLRequest: WAFV2.Types.GetWebACLRequest = {
			Name: this.name,
			Scope,
			Id: this.webAclId,
		}

		// A second custom resource is used for managing the deletion of this construct, since both an Id and LockToken
		// are required for Web ACL Deletion
		new cr.AwsCustomResource(this, `${id}-Delete`, {
			policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
				resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
			onCreate: {
				service: 'WAFV2',
				action: 'getWebACL',
				parameters: getWebACLRequest,
				region: this.region,
				physicalResourceId: cr.PhysicalResourceId.fromResponse('LockToken'),
			},
			onDelete: {
				service: 'WAFV2',
				action: 'deleteWebACL',
				parameters: {
					Name: this.name,
					Scope,
					Id: this.webAclId,
					LockToken: new cr.PhysicalResourceIdReference(),
				},
				region: this.region,
			},
		})
	}

	public getArn = (account: string): string =>
		`arn:aws:wafv2:${this.region}:${account}:global/webacl/${this.name}/${this.webAclId}`;
}
