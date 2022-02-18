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
import { aws_ec2 as ec2, aws_elasticloadbalancingv2 as elb, aws_ecs as ecs, aws_ecr_assets as ecr_assets } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { DefaultWaf } from '@prototype/common'
import { sync as findup } from 'find-up'
import path from 'path'

export interface GraphhopperSetupProps {
	readonly vpc: ec2.IVpc
	readonly dmzSecurityGroup: ec2.ISecurityGroup
	readonly ecsCluster: ecs.ICluster
	readonly osmPbfMapFileUrl: string
	readonly javaOpts?: string
	readonly containerName: string
}

export class GraphhopperSetup extends Construct {
	readonly loadBalancer: elb.IApplicationLoadBalancer

	constructor (scope: Construct, id: string, props: GraphhopperSetupProps) {
		super(scope, id)

		const {
			vpc,
			dmzSecurityGroup,
			ecsCluster,
			osmPbfMapFileUrl,
			javaOpts,
			containerName,
		} = props

		const graphhopperImage = new ecr_assets.DockerImageAsset(this, 'GraphhopperDockerImage', {
			directory: path.join(
				findup('dispatch-setup', { cwd: __dirname, type: 'directory' }) || '../../',
				'src', 'GraphhopperSetup', 'docker'),
			buildArgs: {
				MAPFILE_URL: osmPbfMapFileUrl,
			},
			target: 'prod',
		})

		const graphhopperTask = new ecs.FargateTaskDefinition(this, 'GraphhopperTaskDef', {
			family: namespaced(this, 'graphhopper-task'),
			cpu: 4096,
			memoryLimitMiB: 8192,
			runtimePlatform: {
				cpuArchitecture: ecs.CpuArchitecture.ARM64,
				operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
			},
		})
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const container = graphhopperTask.addContainer('graphhopper-indonesia', {
			image: ecs.ContainerImage.fromDockerImageAsset(graphhopperImage),
			containerName: namespaced(this, containerName),
			environment: {
				JAVA_OPTS: javaOpts || '-Xmx6g -Xms6g -Ddw.server.application_connectors[0].bind_host=0.0.0.0 -Ddw.server.application_connectors[0].port=80',
			},
			portMappings: [{
				containerPort: 80,
				hostPort: 80,
				protocol: ecs.Protocol.TCP,
			}],
			logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'ecs' }),
		})

		const graphhopperService = new ecs.FargateService(this, 'GraphhopperService', {
			cluster: ecsCluster,
			desiredCount: 4,
			securityGroups: [dmzSecurityGroup],
			serviceName: namespaced(this, 'Graphhopper-Indonesia'),
			taskDefinition: graphhopperTask,
			assignPublicIp: true,
			vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
		})

		// setup an application load balancer
		const loadBalancer = new elb.ApplicationLoadBalancer(this, 'GraphhopperALB', {
			vpc,
			internetFacing: false,
			securityGroup: dmzSecurityGroup,
			loadBalancerName: namespaced(this, 'GraphhopperLoadBalancer'),
			vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
		})
		new DefaultWaf(this, 'GraphhopperALBWaf', {
			resourceArn: loadBalancer.loadBalancerArn,
		})
		const albListener = loadBalancer.addListener('GHListener', {
			open: false,
			port: 80,
			protocol: elb.ApplicationProtocol.HTTP,
		})

		albListener.addTargets('GHFargate', {
			port: 80,
			targets: [graphhopperService],
			targetGroupName: namespaced(this, 'graphhopper-targetgroup'),
			protocol: elb.ApplicationProtocol.HTTP,
			healthCheck: {
				path: '/health',
			},
		})

		this.loadBalancer = loadBalancer
	}
}
