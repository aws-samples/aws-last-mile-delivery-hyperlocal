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
import { Stack, NestedStack, NestedStackProps, aws_ec2 as ec2, aws_opensearchservice as opensearchservice, aws_elasticache as elasticache, aws_cognito as cognito } from 'aws-cdk-lib'
import { Networking } from '@prototype/networking'
import { Monitoring } from '@prototype/monitoring'

export interface MonitoringNestedStackProps extends NestedStackProps {
	readonly vpc: ec2.IVpc
	readonly vpcNetworking: Networking
    readonly openSearchDomain: opensearchservice.IDomain
    readonly redisCluster: elasticache.CfnCacheCluster
    readonly internalUserPoolDomain: cognito.IUserPoolDomain
}

export class MonitoringNestedStack extends NestedStack {
	constructor (scope: Construct, id: string, props: MonitoringNestedStackProps) {
		super(scope, id, props)

		const {
			vpc,
			vpcNetworking: {
				securityGroups,
			},
			openSearchDomain,
			redisCluster,
			internalUserPoolDomain,
		} = props

		const { region } = Stack.of(scope)

		const monitoring = new Monitoring(this, 'MonitoringInst', {
			vpc,
			securityGroup: securityGroups.dmz,
			esEndpoint: openSearchDomain.domainEndpoint,
			redisEndpoint: redisCluster.attrRedisEndpointAddress,
			cognitoEndpoint: `${internalUserPoolDomain.domainName}.auth.${region}.amazoncognito.com`,
		})
	}
}
