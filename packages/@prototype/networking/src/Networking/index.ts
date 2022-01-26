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
import { Construct } from '@aws-cdk/core'
import {
	IVpc,
	ISecurityGroup, IInstance,
} from '@aws-cdk/aws-ec2'
import { IngressRule } from './IngressRule'
import { SecurityGroupSetup } from './SecurityGroupSetup'
// import { BastionHostSetup } from './BastionHostSetup'

export interface NetworkingProps {
	readonly vpc: IVpc
	readonly ingressRules: { [key: string]: IngressRule[], }
}

export class Networking extends Construct {
	readonly securityGroups: { [key: string]: ISecurityGroup, }

	// readonly bastionInstance: IInstance

	constructor (scope: Construct, id: string, props: NetworkingProps) {
		super(scope, id)

		const { vpc, ingressRules } = props

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		// const routingSetup = new RoutingSetup(this, 'VpcRoutingSetup', {
		// 	vpc,
		// })

		const securityGroupSetup = new SecurityGroupSetup(this, 'SecurityGroupSetup', {
			vpc,
			ingressRules,
		})

		this.securityGroups = securityGroupSetup.securityGroups

		// setup bastion host
		// const bastionHostSetup = new BastionHostSetup(this, 'BastionHostSetup', {
		// 	vpc,
		// 	bastionSecurityGroup: securityGroupSetup.securityGroups.dmz,
		// })

		// this.bastionInstance = bastionHostSetup.bastionInstance
	}
}
