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
import { Stack, aws_ecs as ecs, aws_ecr_assets as ecr_assets, aws_iam as iam, aws_s3 as s3, aws_iot as iot, aws_ec2 as ec2, aws_cognito as cognito } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'

export interface SimulatorContainerProps {
	readonly name: string
	readonly cpu: number
	readonly memoryMiB: number
	readonly baseUsername: string
	readonly simulatorContainerImageAsset: ecr_assets.DockerImageAsset

	readonly userPool: cognito.UserPool
	readonly identityPool: cognito.CfnIdentityPool
	readonly userPoolClient: cognito.UserPoolClient
	readonly iotIngestionRule: iot.CfnTopicRule
	readonly iotDriverStatusRule: iot.CfnTopicRule
	readonly iotDriverPolicy: iot.CfnPolicy
	readonly ecsVpc: ec2.IVpc
	readonly configBucket: s3.IBucket
	readonly simulatorConfigBucket: s3.IBucket
	readonly configBucketKey: string

	readonly iotEndpointAddress: string

	readonly additionalENVs?: {
		[key: string]: string
	}
}

export class SimulatorContainer extends Construct {
	public readonly taskDefinitionRole: iam.Role

	public readonly taskExecutionRole: iam.Role

	public readonly taskDefinition: ecs.TaskDefinition

	public readonly containerDefinition: ecs.ContainerDefinition

	constructor (scope: Construct, id: string, props: SimulatorContainerProps) {
		super(scope, id)

		const { name, cpu, memoryMiB } = props
		const region = Stack.of(this).region

		// task DEFINITION role
		this.taskDefinitionRole = new iam.Role(this, `SimulatorRole-${name}`, {
			roleName: namespaced(this, `ecs-taskdefinition-${name}`),
			assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
		})

		// container process can auto-create user in cognito
		this.taskDefinitionRole.addToPolicy(new iam.PolicyStatement({
			resources: [props.userPool.userPoolArn],
			actions: [
				'cognito-idp:AdminUpdateUserAttributes',
				'cognito-idp:AdminConfirmSignUp',
				'cognito-idp:AdminDeleteUser',
			],
			effect: iam.Effect.ALLOW,
		}))

		// container process can auto-remove its own user from cognito during tear-down
		this.taskDefinitionRole.addToPolicy(new iam.PolicyStatement({
			resources: ['*'],
			actions: [
				'cognito-identity:DeleteIdentities',
			],
			effect: iam.Effect.ALLOW,
		}))

		// container process can pull config from s3 bucket
		this.taskDefinitionRole.addToPolicy(new iam.PolicyStatement({
			effect: iam.Effect.ALLOW,
			actions: [
				's3:GetObject',
			],
			resources: [
				`${props.configBucket.bucketArn}/*`,
				`${props.simulatorConfigBucket.bucketArn}/*`,
			],
		}))

		// task EXECUTION role
		this.taskExecutionRole = new iam.Role(this, `ECSExecutionRole-${name}`, {
			roleName: namespaced(this, `ecs-execution-${name}`),
			assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
		})

		// enable logging
		this.taskExecutionRole.addToPolicy(new iam.PolicyStatement({
			resources: ['*'],
			actions: [
				'logs:PutLogEvents',
				'logs:CreateLogStream',
			],
			effect: iam.Effect.ALLOW,
		}))

		// enable getting docker image
		this.taskExecutionRole.addToPolicy(new iam.PolicyStatement({
			resources: [props.simulatorContainerImageAsset.repository.repositoryArn],
			actions: [
				'ecr:BatchCheckLayerAvailability',
				'ecr:GetDownloadUrlForLayer',
				'ecr:BatchGetImage',
			],
			effect: iam.Effect.ALLOW,
		}))

		// get auth token
		this.taskExecutionRole.addToPolicy(new iam.PolicyStatement({
			resources: ['*'],
			actions: [
				'ecr:GetAuthorizationToken',
			],
			effect: iam.Effect.ALLOW,
		}))

		// taskDef
		this.taskDefinition = new ecs.TaskDefinition(this, `ECSTaskDefinition-${name}`, {
			taskRole: this.taskDefinitionRole,
			executionRole: this.taskExecutionRole,
			networkMode: ecs.NetworkMode.AWS_VPC,
			compatibility: ecs.Compatibility.FARGATE,
			cpu: `${cpu}`,
			memoryMiB: `${memoryMiB}`,
			runtimePlatform: {
				cpuArchitecture: ecs.CpuArchitecture.ARM64,
				operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
			},
		})

		// containerDef
		this.containerDefinition = this.taskDefinition.addContainer(`ECSContainerDef-${name}`, {
			image: ecs.ContainerImage.fromDockerImageAsset(props.simulatorContainerImageAsset),
			cpu,
			memoryReservationMiB: memoryMiB,
			logging: ecs.LogDriver.awsLogs({ streamPrefix: 'ecs' }),
			environment: {
				REGION: region,
				IDENTITY_POOL_ID: props.identityPool.ref,
				USER_POOL_ID: props.userPool.userPoolId,
				USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
				IOT_POLICY_NAME: props.iotDriverPolicy.policyName || '',
				IOT_INGESTION_RULE_NAME: props.iotIngestionRule.ruleName || '',
				IOT_STATUS_UPDATE_RULE_NAME: props.iotDriverStatusRule.ruleName || '',
				IOT_HOST: props.iotEndpointAddress,
				BASE_USERNAME: props.baseUsername,
				UPDATE_CONFIG_BUCKET: props.configBucket.bucketName,
				UPDATE_CONFIG_PATH: props.configBucketKey,
				CONTAINER_TYPE: name,
				...(props.additionalENVs ? props.additionalENVs : {}),
			},
		})
	}
}
