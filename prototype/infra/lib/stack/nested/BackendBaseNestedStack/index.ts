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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Construct } from 'constructs'
import { NestedStack, NestedStackProps, aws_ec2 as ec2, aws_iam as iam } from 'aws-cdk-lib'
import { Networking } from '@prototype/networking'
import { LiveDataCache } from '@prototype/live-data-cache'
import { PersistentBackendStack } from '../../root/PersistentBackendStack'

export interface BackendBaseNestedStackProps extends NestedStackProps {
	readonly vpc: ec2.IVpc
	readonly identityPoolId: string
	readonly userPoolId: string
	readonly internalIdentityAuthenticatedRole: iam.IRole
	readonly adminRole: iam.IRole
	readonly vpcNetworkConfig: { [key: string]: [{ cidr: string, port: number, }], }
	readonly esConfig: { [key: string]: string | number, }
	readonly redisConfig: { [key: string]: string | number, }
}

/**
 * Prototype backend stack
 */
export class BackendBaseNestedStack extends NestedStack {
	public readonly vpcNetworking: Networking

	public readonly liveDataCache: LiveDataCache

	constructor (scope: Construct, id: string, props: BackendBaseNestedStackProps) {
		super(scope, id, props)

		const {
			vpc,
			identityPoolId,
			userPoolId,
			internalIdentityAuthenticatedRole,
			adminRole,
			vpcNetworkConfig,
			esConfig,
			redisConfig,
		} = props

		this.vpcNetworking = new Networking(this, 'Networking', {
			vpc,
			ingressRules: {
				dmz: vpcNetworkConfig.dmzSecurityIngress.map(o => ({ peer: ec2.Peer.ipv4(o.cidr), port: ec2.Port.tcp(o.port) })),
			},
		})

		const { securityGroups } = this.vpcNetworking

		this.liveDataCache = new LiveDataCache(this, 'LiveDataCache', {
			elasticSearchClusterProps: {
				securityGroups: [securityGroups.redis],
				vpc,
				esConfig,
				identityPoolId,
				userPoolId,
				// internal pool
				authenticatedUserRole: internalIdentityAuthenticatedRole,
				adminRole,
			},
			redisClusterProps: {
				numNodes: 3,
				nodeType: redisConfig.instanceType as string,
				securityGroups: [securityGroups.redis],
				vpc,
			},
		})
	}
}
