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
import { Tags, aws_ec2 as ec2 } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'

export class ECSVpcStack extends Construct {
	public readonly vpc: ec2.IVpc

	public readonly securityGroup: ec2.SecurityGroup

	constructor (scope: Construct, id: string) {
		super(scope, id)

		this.vpc = new ec2.Vpc(this, 'Vpc', {
			cidr: '192.168.0.0/16',
			maxAzs: 2,
			subnetConfiguration: [
				{
					subnetType: ec2.SubnetType.PUBLIC,
					name: namespaced(this, 'public'),
					cidrMask: 18,
				},
			],
		})

		this.securityGroup = new ec2.SecurityGroup(this, 'ECSSecurityGroup', {
			vpc: this.vpc,
			allowAllOutbound: true,
			description: 'Security group used by the ECS container',
			securityGroupName: namespaced(this, 'ECS'),
		})

		this.securityGroup.addIngressRule(this.securityGroup, ec2.Port.allTraffic())

		Tags.of(this.vpc).add('Name', namespaced(this, 'ecs-vpc'))
	}
}
