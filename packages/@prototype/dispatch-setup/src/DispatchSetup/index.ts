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
import { aws_dynamodb as ddb, aws_ec2 as ec2, aws_ecs as ecs, aws_elasticloadbalancingv2 as elb, aws_s3 as s3, aws_ssm as ssm } from 'aws-cdk-lib'
import { DispatchEcsService } from './DispatchEcsService'
import { DispatchEcsCluster } from './DispatchEcsCluster'
import { SameDayDispatchEcsService } from './SameDayDispatchEcsService'

export interface DispatchSetupProps {
	readonly demAreaDispatchEngineSettingsTable: ddb.ITable
	readonly dispatchEngineBucket: s3.IBucket
	readonly dispatcherAssignmentsTable: ddb.ITable
	readonly dispatcherSettings: Record<string, any>
	readonly driverApiKeySecretName: string
	readonly dmzSecurityGroup: ec2.ISecurityGroup
	readonly osmPbfMapFileUrl: string
	readonly parameterStoreKeys: Record<string, string>
	readonly sameDayDirectPudoDeliveryJobs: ddb.ITable
	readonly sameDayDirectPudoSolverJobs: ddb.ITable
	readonly sameDayDirectPudoHubs: ddb.ITable
	readonly sameDayDirectPudoVehicleCapacity: ddb.ITable
	readonly ssmStringParameters: Record<string, ssm.IStringParameter>
	readonly vpc: ec2.IVpc
}

export class DispatchSetup extends Construct {
	readonly dispatcherEcsCluster: ecs.ICluster

	readonly loadBalancer: elb.IApplicationLoadBalancer

	readonly sameDayDeliveryLoadBalancer: elb.IApplicationLoadBalancer

	constructor (scope: Construct, id: string, props: DispatchSetupProps) {
		super(scope, id)

		const {
			demAreaDispatchEngineSettingsTable,
			dispatchEngineBucket,
			dispatcherAssignmentsTable,
			dispatcherSettings,
			driverApiKeySecretName,
			dmzSecurityGroup,
			osmPbfMapFileUrl,
			parameterStoreKeys,
			sameDayDirectPudoDeliveryJobs,
			sameDayDirectPudoSolverJobs,
			sameDayDirectPudoHubs,
			sameDayDirectPudoVehicleCapacity,
			ssmStringParameters,
			vpc,
		} = props

		const dispatchEcsCluster = new DispatchEcsCluster(this, 'DispatchEcsCluster', {
			dispatchEngineBucket,
			dmzSecurityGroup,
			vpc,
		})
		this.dispatcherEcsCluster = dispatchEcsCluster.cluster

		const dispatchEcsService = new DispatchEcsService(this, 'DispatchEcsService', {
			demAreaDispatchEngineSettingsTable,
			dispatchConfig: dispatcherSettings.instant.sequential as Record<string, string | number>,
			dispatchEngineBucket,
			dispatcherAssignmentsTable,
			dmzSecurityGroup,
			driverApiKeySecretName,
			ecsCluster: dispatchEcsCluster.cluster,
			osmPbfMapFileUrl,
			ssmStringParameters,
			vpc,
		})

		this.loadBalancer = dispatchEcsService.loadBalancer

		const sameDayDeliveryDispatchEcsService = new SameDayDispatchEcsService(this, 'SameDayDispatchEcsService', {
			dispatchConfig: dispatcherSettings.sameday.directpudo as Record<string, string | number>,
			dispatchEngineBucket,
			dmzSecurityGroup,
			driverApiKeySecretName,
			ecsCluster: dispatchEcsCluster.cluster,
			osmPbfMapFileUrl,
			parameterStoreKeys,
			sameDayDirectPudoDeliveryJobs,
			sameDayDirectPudoSolverJobs,
			sameDayDirectPudoHubs,
			sameDayDirectPudoVehicleCapacity,
			ssmStringParameters,
			vpc,
		})
		this.sameDayDeliveryLoadBalancer = sameDayDeliveryDispatchEcsService.loadBalancer
	}
}
