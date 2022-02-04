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
import { aws_ec2 as ec2, aws_iam as iam } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'

export interface BastionHostSetupProps {
	readonly vpc: ec2.IVpc
	readonly bastionSecurityGroup: ec2.ISecurityGroup
}

export class BastionHostSetup extends Construct {
	readonly bastionInstance: ec2.IInstance

	constructor (scope: Construct, id: string, props: BastionHostSetupProps) {
		super(scope, id)

		const { vpc, bastionSecurityGroup } = props

		const volume = ec2.BlockDeviceVolume.ebs(10, {
			encrypted: true,
		})

		const bastionHost = new ec2.BastionHostLinux(this, 'BastionHostLinux', {
			vpc,
			instanceName: namespaced(this, 'BastionHost'),
			securityGroup: bastionSecurityGroup,
			subnetSelection: {
				subnetType: ec2.SubnetType.PUBLIC,
			},
			blockDevices: [
				{
					deviceName: '/dev/xvda',
					volume,
				},
			],
		})

		// Use managed policy as recommended in SSM documentation rather than permissive default policy in construct
		// https://docs.aws.amazon.com/systems-manager/latest/userguide/security_iam_service-with-iam.html#security_iam_service-with-iam-roles
		// https://github.com/aws/aws-cdk/blob/283ed02c64f827161edba3e11c3cead3b54b7ee9/packages/%40aws-cdk/aws-ec2/lib/bastion-host.ts#L163-L170
		;(bastionHost.role.node.tryRemoveChild('DefaultPolicy'))
		bastionHost.instance.role.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyName(this, 'BastionHostManagedPolicy', 'AmazonSSMManagedInstanceCore'))

		this.bastionInstance = bastionHost
	}
}
