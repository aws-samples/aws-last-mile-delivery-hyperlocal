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
import { Duration, aws_dynamodb as ddb, aws_ec2 as ec2, aws_elasticloadbalancingv2 as elb, aws_ecs as ecs, aws_ecr_assets as ecr_assets, aws_ecr as ecr, aws_iam as iam, aws_logs as logs, aws_s3 as s3, aws_secretsmanager as secretsmanager, aws_ssm as ssm } from 'aws-cdk-lib'
import * as cdkconsts from 'cdk-constants'
import { namespaced, regionalNamespaced } from '@aws-play/cdk-core'
import { DefaultWaf } from '@prototype/common'
import { readDDBTablePolicyStatement, updateDDBTablePolicyStatement } from '@prototype/lambda-common'
import path from 'path'
import { sync as findup } from 'find-up'

export interface InstantDispatchEcsServiceProps {
	readonly demAreaDispatchEngineSettingsTable: ddb.ITable
	readonly dispatchConfig: Record<string, string | number>
	readonly dispatchEngineBucket: s3.IBucket
	readonly dispatcherAssignmentsTable: ddb.ITable
	readonly dmzSecurityGroup: ec2.ISecurityGroup
	readonly driverApiKeySecretName: string
	readonly ecsCluster: ecs.ICluster
	readonly osmPbfMapFileUrl: string
	readonly ssmStringParameters: Record<string, ssm.IStringParameter>
	readonly vpc: ec2.IVpc
}

export class InstantDispatchEcsService extends Construct {
	readonly loadBalancer: elb.IApplicationLoadBalancer

	readonly dispatcherService: ecs.Ec2Service

	constructor (scope: Construct, id: string, props: InstantDispatchEcsServiceProps) {
		super(scope, id)

		const {
			demAreaDispatchEngineSettingsTable,
			dispatchConfig,
			dispatchEngineBucket,
			dispatcherAssignmentsTable,
			dmzSecurityGroup,
			driverApiKeySecretName,
			ecsCluster,
			osmPbfMapFileUrl,
			ssmStringParameters,
			vpc,
		} = props

		const driverApiKeySecret = secretsmanager.Secret.fromSecretNameV2(this, 'DriverApiKeySecret', driverApiKeySecretName)

		const dispatcherTaskRole = new iam.Role(this, 'DispatcherTaskRole', {
			assumedBy: new iam.ServicePrincipal(cdkconsts.ServicePrincipals.ECS_TASKS),
			description: 'Role for Dispatcher ECS Task',
			inlinePolicies: {
				apiKeyAccess: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							effect: iam.Effect.ALLOW,
							actions: [
								'secretsmanager:GetSecretValue',
							],
							resources: [`${driverApiKeySecret.secretArn}*`],
						}),
					],
				}),
				parameterStoreAccess: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							effect: iam.Effect.ALLOW,
							actions: ['ssm:GetParameter'],
							resources: Object.values(ssmStringParameters).map(param => param.parameterArn),
						}),
					],
				}),
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
				ddbAccess: new iam.PolicyDocument({
					statements: [
						readDDBTablePolicyStatement(demAreaDispatchEngineSettingsTable.tableArn),
						readDDBTablePolicyStatement(dispatcherAssignmentsTable.tableArn),
						updateDDBTablePolicyStatement(dispatcherAssignmentsTable.tableArn),
					],
				}),
			},
			roleName: regionalNamespaced(this, 'Dispatcher-TaskRole'),
		})

		const dispatcherTask = new ecs.Ec2TaskDefinition(this, 'DispatcherTaskDef', {
			family: namespaced(this, 'dispatcher-task'),
			taskRole: dispatcherTaskRole,
			volumes: [
				{
					name: 'externalConfig',
					host: {
						sourcePath: '/opt/dispatcher-app/config',
					},
				},
			],
			networkMode: ecs.NetworkMode.AWS_VPC,
		})

		const dispatcherImage = new ecr_assets.DockerImageAsset(this, 'DispatcherImage', {
			directory: path.join(
				findup('packages', { cwd: __dirname, type: 'directory' }) || '../../../../../',
				'..',
				'prototype', 'dispatch', 'delivery-dispatch', 'build', 'instant', 'sequential',
			),
			buildArgs: {
				MAPFILE_URL: osmPbfMapFileUrl,
			},
			target: 'prod',
		})

		const container = dispatcherTask.addContainer('order-dispatcher', {
			image: ecs.ContainerImage.fromDockerImageAsset(dispatcherImage),
			containerName: namespaced(this, dispatchConfig.containerName as string),
			memoryReservationMiB: dispatchConfig.memoryReservationMiB as number || 6000,
			environment: {
				JAVA_OPTS: '-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager',
				CONFIG_BUCKET: dispatchEngineBucket.bucketName,
			},
			portMappings: [{
				containerPort: dispatchConfig.containerPort as number || 8080,
				hostPort: dispatchConfig.hostPort as number || 8080,
				protocol: ecs.Protocol.TCP,
			}],

			logging: ecs.LogDrivers.awsLogs({
				streamPrefix: 'ecs',
				logGroup: new logs.LogGroup(this, 'order-dispatcher-task-loggroup', {
					logGroupName: namespaced(this, `order-dispatcher-task-${Date.now()}`),
				}),
			}),
		})
		container.addMountPoints({
			containerPath: '/app/config-external',
			sourceVolume: 'externalConfig',
			readOnly: false,
		})

		const dispatcherService = new ecs.Ec2Service(this, 'DispatcherService', {
			cluster: ecsCluster,
			desiredCount: dispatchConfig.ecsTaskCount as number,
			securityGroups: [dmzSecurityGroup],
			serviceName: namespaced(this, 'Order-Dispatcher'),
			taskDefinition: dispatcherTask,
			vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
		})

		// setup an application load balancer
		const loadBalancer = new elb.ApplicationLoadBalancer(this, 'DispatcherALB', {
			vpc,
			internetFacing: false,
			securityGroup: dmzSecurityGroup,
			loadBalancerName: namespaced(this, 'Dispatcher'),
			vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
		})
		new DefaultWaf(this, 'DispatcherALBWaf', {
			resourceArn: loadBalancer.loadBalancerArn,
		})

		loadBalancer.logAccessLogs(dispatchEngineBucket, 'logs/alb-access-logs')

		const albListener = loadBalancer.addListener('DispatcherListener', {
			open: false,
			port: 80,
			protocol: elb.ApplicationProtocol.HTTP,
		})

		albListener.addTargets('DispatcherTarget', {
			port: dispatchConfig.hostPort as number || 8080,
			targets: [dispatcherService],
			targetGroupName: namespaced(this, 'dispatcher-targetgroup'),
			protocol: elb.ApplicationProtocol.HTTP,
			healthCheck: {
				path: '/q/health',
				port: `${dispatchConfig.hostPort as number || 8080}`,
				interval: Duration.seconds(45),
				timeout: Duration.seconds(15),
			},
		})

		this.loadBalancer = loadBalancer
		this.dispatcherService = dispatcherService
	}
}
