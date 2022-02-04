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

export interface RoutingSetupProps {
	readonly vpc: ec2.Vpc
}

export class RoutingSetup extends Construct {
	constructor (scope: Construct, id: string, props: RoutingSetupProps) {
		super(scope, id)

		const { vpc } = props

		// take the first public subnet
		const publicSubnet0 = vpc.publicSubnets[0]

		// create route table
		const privateToNatRouteTable = new ec2.CfnRouteTable(this, 'PrivateSubnetsToNatRouteTable', {
			vpcId: vpc.vpcId,
		})

		// create an elastic IP for the NAT gateway
		const elasticIp = new ec2.CfnEIP(this, 'ElasticIp')

		// create NAT gateway
		const natGateway = new ec2.CfnNatGateway(this, 'NatGateway', {
			allocationId: elasticIp.attrAllocationId,
			subnetId: publicSubnet0.subnetId,
		})

		// route entry in the route table
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const routeToNat = new ec2.CfnRoute(this, 'RouteToNat', {
			routeTableId: privateToNatRouteTable.ref,
			destinationCidrBlock: '0.0.0.0/0',
			natGatewayId: natGateway.ref,
		})

		// associate route table with private subnets
		let i = 0
		for (const privateSubnet of vpc.privateSubnets) {
			new ec2.CfnSubnetRouteTableAssociation(this, `PrivSubnetToRouteTableAssoc-${i++}`, {
				routeTableId: privateToNatRouteTable.ref,
				subnetId: privateSubnet.subnetId,
			})
		}
	}
}
