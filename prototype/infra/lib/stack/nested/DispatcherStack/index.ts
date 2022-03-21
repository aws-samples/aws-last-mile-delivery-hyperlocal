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
import { NestedStack, NestedStackProps, aws_s3 as s3, aws_ec2 as ec2, aws_elasticloadbalancingv2 as elb, aws_dynamodb as ddb, aws_ssm as ssm } from 'aws-cdk-lib'
import { Networking } from '@prototype/networking'
import { DispatchSetup } from '@prototype/dispatch-setup'

export interface DispatcherStackProps extends NestedStackProps {
	readonly demAreaDispatchEngineSettingsTable: ddb.ITable
	readonly dispatchEngineBucket: s3.IBucket
	readonly dispatcherAssignmentsTable: ddb.ITable
	readonly dispatcherSettings: Record<string, any>
	readonly driverApiKeySecretName: string
	readonly osmPbfMapFileUrl: string
	readonly samedayDeliveryDirectPudoJobs: ddb.ITable
	readonly ssmStringParameters: Record<string, ssm.IStringParameter>
	readonly vpc: ec2.IVpc
	readonly vpcNetworking: Networking
}

export class DispatcherStack extends NestedStack {
	readonly graphhopperLB: elb.IApplicationLoadBalancer

	readonly dispatcherLB: elb.IApplicationLoadBalancer

	readonly sameDayDeliveryDispatcherLB: elb.IApplicationLoadBalancer

	constructor (scope: Construct, id: string, props: DispatcherStackProps) {
		super(scope, id, props)

		const {
			demAreaDispatchEngineSettingsTable,
			dispatchEngineBucket,
			dispatcherAssignmentsTable,
			dispatcherSettings,
			driverApiKeySecretName,
			osmPbfMapFileUrl,
			samedayDeliveryDirectPudoJobs,
			ssmStringParameters,
			vpc,
			vpcNetworking: {
				securityGroups,
			},
		} = props

		const dispatchSetup = new DispatchSetup(this, 'DispatchSetup', {
			demAreaDispatchEngineSettingsTable,
			dispatchEngineBucket,
			dispatcherAssignmentsTable,
			dispatcherSettings,
			driverApiKeySecretName,
			dmzSecurityGroup: securityGroups.dmz,
			osmPbfMapFileUrl,
			samedayDeliveryDirectPudoJobs,
			ssmStringParameters,
			vpc,
		})

		this.dispatcherLB = dispatchSetup.loadBalancer
		this.sameDayDeliveryDispatcherLB = dispatchSetup.samedayDeliveryLoadBalancer
	}
}
