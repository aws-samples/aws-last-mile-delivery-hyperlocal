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
import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as elb from '@aws-cdk/aws-elasticloadbalancingv2'
import { namespaced } from '@aws-play/cdk-core'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DispatchLBProps {
    readonly vpc: ec2.IVpc
    readonly dmzSecurityGroup: ec2.ISecurityGroup
}

export class DispatchLB extends cdk.Construct {
	readonly loadBalancer: elb.IApplicationLoadBalancer

	readonly httpListener: elb.IApplicationListener

	readonly instanceTargetGroup: elb.IApplicationTargetGroup

	constructor (scope: cdk.Construct, id: string, props: DispatchLBProps) {
		super(scope, id)

		const {
			vpc,
			dmzSecurityGroup,
		} = props

		// setup an application load balancer
		const loadBalancer = new elb.ApplicationLoadBalancer(this, 'DispatcherALB', {
			vpc,
			internetFacing: false,
			securityGroup: dmzSecurityGroup,
			loadBalancerName: namespaced(this, 'DispatcherLoadBalancer'),
			vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
		})

		const albListener = loadBalancer.addListener('Listener', {
			open: false,
			port: 80,
			protocol: elb.ApplicationProtocol.HTTP,
		})

		const targetGroup = new elb.ApplicationTargetGroup(this, 'DispatcherTargetGroup', {
			targetGroupName: namespaced(this, 'dispatcher-targetgroup'),
			targetType: elb.TargetType.INSTANCE,
			protocol: elb.ApplicationProtocol.HTTP,
			healthCheck: {
				path: '/q/health',
			},
			port: 80,
			vpc,
		})

		albListener.addTargetGroups('DispatcherTargetGroups', {
			targetGroups: [targetGroup],
		})

		this.loadBalancer = loadBalancer
		this.httpListener = albListener
		this.instanceTargetGroup = targetGroup
	}
}
