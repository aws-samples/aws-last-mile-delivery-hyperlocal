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
import * as ddb from '@aws-cdk/aws-dynamodb'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as ecs from '@aws-cdk/aws-ecs'
import * as elb from '@aws-cdk/aws-elasticloadbalancingv2'
import * as s3 from '@aws-cdk/aws-s3'
import { DispatchHosting } from './DispatchHosting'
import { DispatchEcsService } from './DispatchEcsService'
import { DispatchEcsCluster } from './DispatchEcsCluster'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DispatchSetupProps {
    readonly vpc: ec2.IVpc
    readonly dmzSecurityGroup: ec2.ISecurityGroup
    readonly driverApiUrl: string
    readonly driverApiKeySecretName: string
    readonly dispatchEngineBucket: s3.IBucket
    readonly dispatcherConfigPath: string
    readonly dispatcherVersion: string
	readonly dispatcherAppDockerRepoName: string
	readonly demAreaDispatchEngineSettingsTable: ddb.ITable
	readonly dispatcherAssignmentsTable: ddb.ITable
}

export class DispatchSetup extends cdk.Construct {
	// readonly dispatchInstance: ec2.IInstance

	readonly dispatcherEcsCluster: ecs.ICluster

	readonly loadBalancer: elb.IApplicationLoadBalancer

	constructor (scope: cdk.Construct, id: string, props: DispatchSetupProps) {
		super(scope, id)

		const {
			vpc,
			dmzSecurityGroup,
			driverApiUrl,
			driverApiKeySecretName,
			dispatchEngineBucket,
			dispatcherConfigPath,
			dispatcherVersion,
			dispatcherAppDockerRepoName,
			demAreaDispatchEngineSettingsTable,
			dispatcherAssignmentsTable,
		} = props

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const dispatchHosting = new DispatchHosting(this, 'DispatchHosting', {
			dispatchEngineBucket,
			driverApiUrl,
			driverApiKeySecretName,
			dispatcherConfigPath,
			dispatcherVersion,
			dispatcherAssignmentTableName: dispatcherAssignmentsTable.tableName,
			demographicAreaDispatcherSettingsTableName: demAreaDispatchEngineSettingsTable.tableName,
		})

		// const dispatcherInstanceConstr = new DispatchInstance(this, 'DispatchInstance', {
		// 	vpc,
		// 	dmzSecurityGroup,
		// 	dispatchEngineBucket,
		// 	driverApiKeySecretName,
		// 	demAreaDispatchEngineSettingsTable,
		// 	dispatcherAssignmentsTable,
		// })
		// this.dispatchInstance = dispatcherInstanceConstr.instance

		// const instanceTarget = new elbt.InstanceIdTarget(dispatcherInstanceConstr.instance.instanceId, 80)
		// dispatchLBTargetGroup.addTarget(instanceTarget)

		const dispatchEcsCluster = new DispatchEcsCluster(this, 'DispatchEcsCluster', {
			dispatchEngineBucket,
			dmzSecurityGroup,
			vpc,
		})
		this.dispatcherEcsCluster = dispatchEcsCluster.cluster

		const dispatchEcsService = new DispatchEcsService(this, 'DispatchEcsService', {
			vpc,
			dmzSecurityGroup,
			ecsCluster: dispatchEcsCluster.cluster,
			dispatchEngineBucket,
			driverApiKeySecretName,
			dockerRepoName: dispatcherAppDockerRepoName,
			demAreaDispatchEngineSettingsTable,
			dispatcherAssignmentsTable,
		})

		this.loadBalancer = dispatchEcsService.loadBalancer
	}
}
