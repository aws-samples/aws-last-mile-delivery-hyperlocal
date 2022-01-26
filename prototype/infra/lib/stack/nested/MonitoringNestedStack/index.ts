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
import { Construct, Stack, NestedStack, NestedStackProps } from '@aws-cdk/core'
import { Networking } from '@prototype/networking'
import { IVpc } from '@aws-cdk/aws-ec2'
import { IDomain } from '@aws-cdk/aws-elasticsearch'
import { CfnCacheCluster } from '@aws-cdk/aws-elasticache'
import { IUserPoolDomain } from '@aws-cdk/aws-cognito'
import { Monitoring } from '@prototype/monitoring'

export interface MonitoringNestedStackProps extends NestedStackProps {
	readonly vpc: IVpc
	readonly vpcNetworking: Networking
    readonly esDomain: IDomain
    readonly redisCluster: CfnCacheCluster
    readonly internalUserPoolDomain: IUserPoolDomain
}

export class MonitoringNestedStack extends NestedStack {
	constructor (scope: Construct, id: string, props: MonitoringNestedStackProps) {
		super(scope, id, props)

		const {
			vpc,
			vpcNetworking: {
				securityGroups,
			},
			esDomain,
			redisCluster,
			internalUserPoolDomain,
		} = props

		const { region } = Stack.of(scope)

		const monitoring = new Monitoring(this, 'MonitoringInst', {
			vpc,
			securityGroup: securityGroups.dmz,
			esEndpoint: esDomain.domainEndpoint,
			redisEndpoint: redisCluster.attrRedisEndpointAddress,
			cognitoEndpoint: `${internalUserPoolDomain.domainName}.auth.${region}.amazoncognito.com`,
		})
	}
}
