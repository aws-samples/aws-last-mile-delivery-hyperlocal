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
import { aws_dynamodb as ddb, aws_ec2 as ec2, aws_ecs as ecs, aws_elasticloadbalancingv2 as elb, aws_s3 as s3 } from 'aws-cdk-lib'
import { DispatchHosting } from './DispatchHosting'
import { DispatchEcsService } from './DispatchEcsService'
import { DispatchEcsCluster } from './DispatchEcsCluster'

export interface DispatchSetupProps {
    readonly vpc: ec2.IVpc
    readonly dmzSecurityGroup: ec2.ISecurityGroup
    readonly driverApiUrl: string
    readonly driverApiKeySecretName: string
    readonly dispatchEngineBucket: s3.IBucket
    readonly dispatcherConfigPath: string
    readonly dispatcherVersion: string
	readonly dispatcherDockerOsmPbfMapFileUrl: string
	readonly dispatcherDockerContainerName: string
	readonly demAreaDispatchEngineSettingsTable: ddb.ITable
	readonly dispatcherAssignmentsTable: ddb.ITable
}

export class DispatchSetup extends Construct {
	readonly dispatcherEcsCluster: ecs.ICluster

	readonly loadBalancer: elb.IApplicationLoadBalancer

	constructor (scope: Construct, id: string, props: DispatchSetupProps) {
		super(scope, id)

		const {
			vpc,
			dmzSecurityGroup,
			driverApiUrl,
			driverApiKeySecretName,
			dispatchEngineBucket,
			dispatcherConfigPath,
			dispatcherVersion,
			dispatcherDockerContainerName,
			dispatcherDockerOsmPbfMapFileUrl,
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
			containerName: dispatcherDockerContainerName,
			osmPbfMapFileUrl: dispatcherDockerOsmPbfMapFileUrl,
			demAreaDispatchEngineSettingsTable,
			dispatcherAssignmentsTable,
		})

		this.loadBalancer = dispatchEcsService.loadBalancer
	}
}
