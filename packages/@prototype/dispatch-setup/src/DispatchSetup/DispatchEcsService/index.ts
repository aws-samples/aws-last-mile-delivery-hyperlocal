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
import * as elb from '@aws-cdk/aws-elasticloadbalancingv2'
import * as ecs from '@aws-cdk/aws-ecs'
import * as ecr from '@aws-cdk/aws-ecr'
import * as iam from '@aws-cdk/aws-iam'
import * as logs from '@aws-cdk/aws-logs'
import * as s3 from '@aws-cdk/aws-s3'
import * as secr from '@aws-cdk/aws-secretsmanager'
import * as cdkconsts from 'cdk-constants'
import { namespaced, regionalNamespaced } from '@aws-play/cdk-core'
import { readDDBTablePolicyStatement, updateDDBTablePolicyStatement } from '@prototype/lambda-common'

export interface DispatchEcsServiceProps {
	readonly vpc: ec2.IVpc
	readonly dmzSecurityGroup: ec2.ISecurityGroup
	readonly ecsCluster: ecs.ICluster
	readonly dispatchEngineBucket: s3.IBucket
	readonly driverApiKeySecretName: string
	readonly dockerRepoName: string
	readonly demAreaDispatchEngineSettingsTable: ddb.ITable
	readonly dispatcherAssignmentsTable: ddb.ITable
}

export class DispatchEcsService extends cdk.Construct {
	readonly loadBalancer: elb.IApplicationLoadBalancer

	readonly dispatcherService: ecs.Ec2Service

	constructor (scope: cdk.Construct, id: string, props: DispatchEcsServiceProps) {
		super(scope, id)

		const {
			vpc,
			dmzSecurityGroup,
			ecsCluster,
			dispatchEngineBucket,
			driverApiKeySecretName,
			dockerRepoName,
			demAreaDispatchEngineSettingsTable,
			dispatcherAssignmentsTable,
		} = props

		const dockerRepo = ecr.Repository.fromRepositoryName(this, 'DispatcherDockerRepo', dockerRepoName)
		const driverApiKeySecret = secr.Secret.fromSecretNameV2(this, 'DriverApiKeySecret', driverApiKeySecretName)

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

		const container = dispatcherTask.addContainer('order-dispatcher', {
			image: ecs.ContainerImage.fromEcrRepository(dockerRepo),
			containerName: namespaced(this, 'order-dispatcher'),
			memoryReservationMiB: 6000,
			environment: {
				JAVA_OPTS: '-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager',
				CONFIG_BUCKET: dispatchEngineBucket.bucketName,
			},
			portMappings: [{
				containerPort: 8080,
				hostPort: 8080,
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
			desiredCount: 10,
			securityGroups: [dmzSecurityGroup],
			serviceName: namespaced(this, 'Order-Dispatcher'),
			taskDefinition: dispatcherTask,
			// assignPublicIp: true,
			vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
		})

		// setup an application load balancer
		const loadBalancer = new elb.ApplicationLoadBalancer(this, 'DispatcherALB', {
			vpc,
			internetFacing: false,
			securityGroup: dmzSecurityGroup,
			loadBalancerName: namespaced(this, 'Dispatcher'),
			vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
		})

		loadBalancer.logAccessLogs(dispatchEngineBucket, 'logs/alb-access-logs')

		const albListener = loadBalancer.addListener('DispatcherListener', {
			open: false,
			port: 80,
			protocol: elb.ApplicationProtocol.HTTP,
		})

		albListener.addTargets('DispatcherTarget', {
			port: 8080,
			targets: [dispatcherService],
			targetGroupName: namespaced(this, 'dispatcher-targetgroup'),
			protocol: elb.ApplicationProtocol.HTTP,
			healthCheck: {
				path: '/q/health',
				port: '8080',
				interval: cdk.Duration.seconds(45),
				timeout: cdk.Duration.seconds(15),
			},
		})

		this.loadBalancer = loadBalancer
		this.dispatcherService = dispatcherService
	}
}
