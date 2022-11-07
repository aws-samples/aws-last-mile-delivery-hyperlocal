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
import { aws_ecs as ecs, aws_ecr_assets as ecr_assets, aws_iam as iam, aws_ssm as ssm, aws_ec2 as ec2, aws_elasticloadbalancingv2 as elb } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { namespaced, regionalNamespaced } from '@aws-play/cdk-core'
import { DefaultWaf } from '@prototype/common'
import { sync as findup } from 'find-up'
import path from 'path'

export interface MemDBMonitoringProps {
	readonly parameterStoreKeys: Record<string, string>
	readonly memoryDBConfig: Record<string, string | number>
	readonly vpc: ec2.IVpc
	readonly dmzSecurityGroup: ec2.ISecurityGroup
	readonly ecsTaskCount: number
}

export class MemDBMonitoring extends Construct {
	constructor (scope: Construct, id: string, props: MemDBMonitoringProps) {
		super(scope, id)

		const { parameterStoreKeys, memoryDBConfig, vpc, dmzSecurityGroup, ecsTaskCount } = props
		const memoryDBAdminPassSecretArnParam = ssm.StringParameter.fromStringParameterName(this, 'memoryDBAdminPassSecretArnSSMParam', parameterStoreKeys.memoryDBAdminPassSecretArn)
		const memoryDBClusterEndpointParam = ssm.StringParameter.fromStringParameterName(this, 'memoryDBClusterEndpointSSMParam', parameterStoreKeys.memoryDBClusterEndpoint)

		const monitoringTaskRole = new iam.Role(this, 'MemDBMonitoringTaskRole', {
			assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
			description: 'MemDB monitoring task role',
			roleName: regionalNamespaced(this, 'MemDBMonitoringTask'),
			inlinePolicies: {
				secretManagerAccess: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							actions: ['secretsManager:GetSecretValue'],
							effect: iam.Effect.ALLOW,
							resources: [memoryDBAdminPassSecretArnParam.stringValue],
						}),
					],
				}),
			},
		})

		const monitoringTask = new ecs.FargateTaskDefinition(this, 'MemDBMonitoringTaskDef', {
			family: namespaced(this, 'memdb-monitoring'),
			cpu: 512,
			memoryLimitMiB: 2048,
			taskRole: monitoringTaskRole,
			runtimePlatform: {
				cpuArchitecture: ecs.CpuArchitecture.ARM64,
				operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
			},
		})

		const monitoringImage = new ecr_assets.DockerImageAsset(this, 'MemDBMonitoringImage', {
			directory: path.join(
				findup('@prototype', { cwd: __dirname, type: 'directory' }) || '../../',
				'monitoring', 'src', 'MemDbMonitoring', 'docker'),
		})

		monitoringTask.addContainer('MemDBMonitoringContainer', {
			image: ecs.ContainerImage.fromDockerImageAsset(monitoringImage),
			containerName: namespaced(this, 'MemDBMonitoringContainer'),
			memoryReservationMiB: 1024,
			environment: {
				REDIS_USERNAME: memoryDBConfig.adminUsername as string,
				REDIS_HOST: memoryDBClusterEndpointParam.stringValue,
				REDIS_PORT: `${memoryDBConfig.port as number}`,
				REDIS_TLS: 'true',
				PASSWORD_SECRET_ARN: memoryDBAdminPassSecretArnParam.stringValue,
				PORT: '8080',
			},
			portMappings: [{
				containerPort: 8080,
				hostPort: 8080,
				protocol: ecs.Protocol.TCP,
			}],
			logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'ecs' }),
		})

		const ecsCluster = new ecs.Cluster(this, 'MemDBMonitoringCluster', {
			clusterName: namespaced(this, 'MemDBMonitoring'),
			containerInsights: true,
			vpc,
		})

		const monitoringService = new ecs.FargateService(this, 'MemDBMonitoringService', {
			cluster: ecsCluster,
			desiredCount: ecsTaskCount,
			securityGroups: [dmzSecurityGroup],
			serviceName: namespaced(this, 'MemoryDB-Monitoring'),
			taskDefinition: monitoringTask,
			assignPublicIp: true,
			vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
		})

		// setup an application load balancer
		const loadBalancer = new elb.ApplicationLoadBalancer(this, 'MemDBMonitoringALB', {
			vpc,
			internetFacing: true,
			securityGroup: dmzSecurityGroup,
			loadBalancerName: namespaced(this, 'MemDBMonitoringLoadBalancer'),
			vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
		})
		new DefaultWaf(this, 'MemDBMonitoringALBWaf', {
			resourceArn: loadBalancer.loadBalancerArn,
		})

		const albListener = loadBalancer.addListener('MemDBMonitoringListener', {
			open: false,
			port: 80,
			protocol: elb.ApplicationProtocol.HTTP,
		})
		albListener.connections.addSecurityGroup(dmzSecurityGroup)

		albListener.addTargets('MemDBMonitoring', {
			port: 80,
			targets: [monitoringService],
			targetGroupName: namespaced(this, 'memdb-monitoring-targetgroup'),
			protocol: elb.ApplicationProtocol.HTTP,
			healthCheck: {
				path: '/healthcheck',
			},
		})
	}
}
