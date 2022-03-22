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

export interface SameDayDispatchEcsServiceProps {
	readonly dispatchConfig: Record<string, string | number>
	readonly dispatchEngineBucket: s3.IBucket
	readonly dmzSecurityGroup: ec2.ISecurityGroup
	readonly driverApiKeySecretName: string
	readonly ecsCluster: ecs.ICluster
	readonly osmPbfMapFileUrl: string
	readonly parameterStoreKeys: Record<string, string>
	readonly samedayDirectPudoDeliveryJobs: ddb.ITable
	readonly samedayDirectPudoSolverJobs: ddb.ITable
	readonly ssmStringParameters: Record<string, ssm.IStringParameter>
	readonly vpc: ec2.IVpc
}

export class SameDayDispatchEcsService extends Construct {
	readonly loadBalancer: elb.IApplicationLoadBalancer

	readonly dispatcherService: ecs.Ec2Service

	constructor (scope: Construct, id: string, props: SameDayDispatchEcsServiceProps) {
		super(scope, id)

		const {
			dispatchConfig,
			dispatchEngineBucket,
			dmzSecurityGroup,
			driverApiKeySecretName,
			ecsCluster,
			osmPbfMapFileUrl,
			parameterStoreKeys,
			samedayDirectPudoDeliveryJobs,
			samedayDirectPudoSolverJobs,
			ssmStringParameters,
			vpc,
		} = props

		const driverApiKeySecret = secretsmanager.Secret.fromSecretNameV2(this, 'DriverApiKeySecret', driverApiKeySecretName)
		const samedayDirectPudoDeliveryJobsSolverJobIdIndexName =
			ssmStringParameters[parameterStoreKeys.samedayDirectPudoDeliveryJobsSolverJobIdIndex].stringValue

		const dispatcherTaskRole = new iam.Role(this, 'SameDayDeliveryDirectPudoDispatcherTaskRole', {
			assumedBy: new iam.ServicePrincipal(cdkconsts.ServicePrincipals.ECS_TASKS),
			description: 'Role for Same Day Delivery Direct PUDO Dispatcher ECS Task',
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
				ddbAccess: new iam.PolicyDocument({
					statements: [
						readDDBTablePolicyStatement(samedayDirectPudoDeliveryJobs.tableArn),
						updateDDBTablePolicyStatement(samedayDirectPudoDeliveryJobs.tableArn),
						readDDBTablePolicyStatement(`${samedayDirectPudoDeliveryJobs.tableArn}/index/${samedayDirectPudoDeliveryJobsSolverJobIdIndexName}`),
						readDDBTablePolicyStatement(samedayDirectPudoSolverJobs.tableArn),
						updateDDBTablePolicyStatement(samedayDirectPudoSolverJobs.tableArn),
					],
				}),
			},
			roleName: regionalNamespaced(this, 'Dispatcher-SDDDirectPudo-TaskRole'),
		})

		const dispatcherTask = new ecs.Ec2TaskDefinition(this, 'SameDayDeliveryDirectPudoDispatcherTaskDef', {
			family: namespaced(this, 'dispatcher-sameday-directpudo-task'),
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

		const dispatcherImage = new ecr_assets.DockerImageAsset(this, 'SameDayDeliveryDirectPudoDispatcherImage', {
			directory: path.join(
				findup('packages', { cwd: __dirname, type: 'directory' }) || '../../../../../',
				'..',
				'prototype', 'dispatch', 'delivery-dispatch', 'build', 'sameday', 'directpudo',
			),
			buildArgs: {
				MAPFILE_URL: osmPbfMapFileUrl,
			},
			target: 'prod',
		})

		const container = dispatcherTask.addContainer('dispatcher-sameday-directpudo', {
			image: ecs.ContainerImage.fromDockerImageAsset(dispatcherImage),
			containerName: namespaced(this, dispatchConfig.containerName as string),
			memoryReservationMiB: dispatchConfig.memoryReservationMiB as number || 8192,
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
				logGroup: new logs.LogGroup(this, 'dispatcher-sameday-directpudo-task-loggroup', {
					logGroupName: namespaced(this, `dispatcher-sameday-directpudo-task-${Date.now()}`),
				}),
			}),
		})

		// TODO: do we need this?
		container.addMountPoints({
			containerPath: '/app/config-external',
			sourceVolume: 'externalConfig',
			readOnly: false,
		})

		const dispatcherService = new ecs.Ec2Service(this, 'Dispatcher-SameDayDirectPudo-Service', {
			cluster: ecsCluster,
			desiredCount: dispatchConfig.ecsTaskCount as number,
			securityGroups: [dmzSecurityGroup],
			serviceName: namespaced(this, 'Dispatcher-SameDay-DirectPudo'),
			taskDefinition: dispatcherTask,
			vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
		})

		// setup an application load balancer
		const loadBalancer = new elb.ApplicationLoadBalancer(this, 'Dispatcher-SameDayDirectPudo-ALB', {
			vpc,
			internetFacing: false,
			securityGroup: dmzSecurityGroup,
			loadBalancerName: namespaced(this, 'Dispatcher-SDD-ALB'),
			vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
		})
		new DefaultWaf(this, 'Dispatcher-SameDayDirectPudo-ALB-Waf', {
			resourceArn: loadBalancer.loadBalancerArn,
		})

		loadBalancer.logAccessLogs(dispatchEngineBucket, 'logs/alb-sameday-directpudo-access-logs')

		const albListener = loadBalancer.addListener('Dispatch-SameDayDirectPudo-Listener', {
			open: false,
			port: 80,
			protocol: elb.ApplicationProtocol.HTTP,
		})

		albListener.addTargets('Dispatch-SameDayDirectPudo-Target', {
			port: dispatchConfig.hostPort as number || 8080,
			targets: [dispatcherService],
			targetGroupName: namespaced(this, 'dispatcher-SDD-TG'),
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
