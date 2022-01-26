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
import * as as from '@aws-cdk/aws-autoscaling'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as ecs from '@aws-cdk/aws-ecs'
import * as iam from '@aws-cdk/aws-iam'
import * as s3 from '@aws-cdk/aws-s3'
import * as cdkconsts from 'cdk-constants'
import { namespaced, regionalNamespaced } from '@aws-play/cdk-core'

export interface DispatchEcsClusterProps {
  readonly vpc: ec2.IVpc
  readonly dmzSecurityGroup: ec2.ISecurityGroup
  readonly dispatchEngineBucket: s3.IBucket
}

export class DispatchEcsCluster extends cdk.Construct {
	readonly cluster: ecs.ICluster

	constructor (scope: cdk.Construct, id: string, props: DispatchEcsClusterProps) {
		super(scope, id)

		const {
			vpc,
			dmzSecurityGroup,
			dispatchEngineBucket,
		} = props

		const dispatchEcsCluster = new ecs.Cluster(this, 'DispatcherEcsCluster', {
			vpc,
			clusterName: namespaced(this, 'DispatcherCluster'),
			containerInsights: true,
		})

		// instance IAM role
		const asgInstanceRole = new iam.Role(this, 'DispatcherAsgInstanceRole', {
			assumedBy: new iam.ServicePrincipal(cdkconsts.ServicePrincipals.EC2),
			description: 'Instance Role for Dispatcher ASG instance',
			inlinePolicies: {
				bucketAccess: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							effect: iam.Effect.ALLOW,
							actions: [
								's3:GetObject',
								's3:HeadObject',
								's3:ListBucket',
								's3:PutObject',
							],
							resources: [
								dispatchEngineBucket.bucketArn,
								`${dispatchEngineBucket.bucketArn}/*`,
							],
						}),
					],
				}),
			},
			roleName: regionalNamespaced(this, 'Dispatch-ASG-Instance'),
		})

		const asg = new as.AutoScalingGroup(this, 'DispatcherEcsAsg', {
			instanceType: ec2.InstanceType.of(ec2.InstanceClass.C6G, ec2.InstanceSize.XLARGE8),
			machineImage: ecs.EcsOptimizedImage.amazonLinux2(ecs.AmiHardwareType.ARM),
			vpc,
			vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
			securityGroup: dmzSecurityGroup,
			blockDevices: [{
				deviceName: '/dev/xvda',
				volume: as.BlockDeviceVolume.ebs(64, {
					deleteOnTermination: true,
					encrypted: true,
				}),
			}],
			desiredCapacity: 2,
			role: asgInstanceRole,
		})

		asg.userData.addCommands(
			'mkdir -p /opt/dispatcher-app/config',
			`docker run --rm -it amazon/aws-cli s3 cp 's3://${dispatchEngineBucket.bucketName}/dispatcher-app/config/application.properties' '/opt/dispatcher-app/config/application.properties'`,
		)

		const asgCapacityProvider = new ecs.AsgCapacityProvider(this, 'DispatcherEcsClusterAsgCP', {
			autoScalingGroup: asg,
			capacityProviderName: namespaced(this, 'dispatcher-ecs-cluster-capacity-provider'),
			enableManagedScaling: true,
			machineImageType: ecs.MachineImageType.AMAZON_LINUX_2,
		})
		dispatchEcsCluster.addAsgCapacityProvider(asgCapacityProvider)

		this.cluster = dispatchEcsCluster
	}
}
