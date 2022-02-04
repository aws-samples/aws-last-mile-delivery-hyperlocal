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
import { aws_ec2 as ec2 } from 'aws-cdk-lib'
import { IngressRule } from '../IngressRule'
import { namespaced } from '@aws-play/cdk-core'

export interface SecurityGroupSetupProps {
	readonly vpc: ec2.IVpc
	readonly ingressRules: { [key: string]: IngressRule[], }
}

export class SecurityGroupSetup extends Construct {
	readonly securityGroups: { [key: string]: ec2.ISecurityGroup, }

	constructor (scope: Construct, id: string, props: SecurityGroupSetupProps) {
		super(scope, id)

		const { vpc, ingressRules } = props
		this.securityGroups = {}

		// DMZ security group
		const dmzSecurityGroup = new ec2.SecurityGroup(this, 'DmzSecurityGroup', {
			vpc,
			allowAllOutbound: true,
			description: 'DMZ to allow SSH connections to EC2 instances',
			securityGroupName: namespaced(this, 'DMZ'),
		})

		dmzSecurityGroup.addIngressRule(dmzSecurityGroup, ec2.Port.allTraffic(), 'Access from DMZ')

		if (ingressRules.dmz !== undefined) {
			for (const ingressRule of ingressRules.dmz) {
				dmzSecurityGroup.addIngressRule(ingressRule.peer, ingressRule.port)
			}
		}

		// Lambda securityGroup
		const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
			vpc,
			allowAllOutbound: true,
			description: 'Security group for Lambdas in VPC',
			securityGroupName: namespaced(this, 'Lambda'),
		})

		// access dmz items from lambda
		dmzSecurityGroup.addIngressRule(lambdaSecurityGroup, ec2.Port.allTraffic(), 'Access from lambdas')

		// Redis securityGroup
		const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
			vpc,
			allowAllOutbound: true,
			description: 'Security group for Redis cluster in VPC',
			securityGroupName: namespaced(this, 'Redis'),
		})

		redisSecurityGroup.addIngressRule(dmzSecurityGroup, ec2.Port.tcp(6379)) // redis
		redisSecurityGroup.addIngressRule(dmzSecurityGroup, ec2.Port.tcp(443)) // kibana
		redisSecurityGroup.addIngressRule(lambdaSecurityGroup, ec2.Port.allTraffic())

		this.securityGroups.lambda = lambdaSecurityGroup
		this.securityGroups.dmz = dmzSecurityGroup
		this.securityGroups.redis = redisSecurityGroup
	}
}
