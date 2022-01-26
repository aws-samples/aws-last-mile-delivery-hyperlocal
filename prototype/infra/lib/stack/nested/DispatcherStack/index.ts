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
import { Construct, NestedStack, NestedStackProps } from '@aws-cdk/core'
import { IBucket } from '@aws-cdk/aws-s3'
import { Networking } from '@prototype/networking'
import { DispatchSetup, GraphhopperSetup } from '@prototype/dispatch-setup'
import { IVpc } from '@aws-cdk/aws-ec2'
import * as elb from '@aws-cdk/aws-elasticloadbalancingv2'
import * as ddb from '@aws-cdk/aws-dynamodb'
import * as ecs from '@aws-cdk/aws-ecs'

export interface DispatcherStackProps extends NestedStackProps {
	readonly vpc: IVpc
	readonly vpcNetworking: Networking
	readonly driverApiUrl: string
	readonly driverApiKeySecretName: string
	readonly dispatchEngineBucket: IBucket
	readonly dispatcherConfigPath: string
	readonly dispatcherVersion: string
	readonly dispatcherAppDockerRepoName: string
	readonly demAreaDispatchEngineSettingsTable: ddb.ITable
	readonly dispatcherAssignmentsTable: ddb.ITable
}

export class DispatcherStack extends NestedStack {
	readonly graphhopperLB: elb.IApplicationLoadBalancer

	readonly dispatcherLB: elb.IApplicationLoadBalancer

	constructor (scope: Construct, id: string, props: DispatcherStackProps) {
		super(scope, id, props)

		const {
			vpc,
			vpcNetworking: {
				securityGroups,
			},
			dispatchEngineBucket,
			driverApiKeySecretName,
			dispatcherConfigPath,
			dispatcherVersion,
			driverApiUrl,
			dispatcherAppDockerRepoName,
			demAreaDispatchEngineSettingsTable,
			dispatcherAssignmentsTable,
		} = props

		const dispatchSetup = new DispatchSetup(this, 'DispatchSetup', {
			vpc,
			dmzSecurityGroup: securityGroups.dmz,
			dispatchEngineBucket,
			dispatcherConfigPath,
			dispatcherVersion,
			driverApiKeySecretName,
			driverApiUrl,
			demAreaDispatchEngineSettingsTable,
			dispatcherAssignmentsTable,
			dispatcherAppDockerRepoName,
		})

		this.dispatcherLB = dispatchSetup.loadBalancer
	}
}
