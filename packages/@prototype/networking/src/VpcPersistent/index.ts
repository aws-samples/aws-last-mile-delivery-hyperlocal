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
import { namespaced, retainResource } from '@aws-play/cdk-core'

export interface VpcPersistentProps {
	readonly vpcCidr: string
	readonly vpcName: string
}

export class VpcPersistent extends Construct {
	readonly vpc: ec2.IVpc

	constructor (scope: Construct, id: string, props: VpcPersistentProps) {
		super(scope, id)

		const { vpcCidr, vpcName } = props

		// create a VPC
		const vpc = new ec2.Vpc(this, 'Vpc', {
			cidr: vpcCidr,

			maxAzs: 3,

			subnetConfiguration: [
				{
					subnetType: ec2.SubnetType.PUBLIC,
					name: namespaced(this, 'public'),
					cidrMask: 24,
				},
				{
					subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
					cidrMask: 24,
					name: namespaced(this, 'private'),
				},
				{
					subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					cidrMask: 24,
					name: namespaced(this, 'isolated'),
				},
			],
			natGateways: 1, // PROD: review this value
			natGatewayProvider: ec2.NatProvider.gateway(),
		})

		Tags.of(vpc).add('Name', namespaced(this, vpcName))

		retainResource(vpc)

		this.vpc = vpc
	}
}
