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
import { Duration, aws_ec2 as ec2, aws_iam as iam, aws_ecs as ecs, aws_lambda as lambda } from 'aws-cdk-lib'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'

export interface GraphhopperManagerProps {
    readonly vpc: ec2.IVpc
	readonly securityGroup: ec2.SecurityGroup
	readonly cluster: ecs.Cluster
	readonly taskDefinition: ecs.TaskDefinition
	readonly containerDefinition: ecs.ContainerDefinition
	readonly taskExecutionRole: iam.Role
	readonly taskDefinitionRole: iam.Role
}

export class GraphhopperManager extends Construct {
	public readonly lambda: lambda.Function

	constructor (scope: Construct, id: string, props: GraphhopperManagerProps) {
		super(scope, id)

		this.lambda = new lambda.Function(this, 'GraphhopperEcsManager', {
			functionName: namespaced(this, 'GraphhopperEcsManager'),
			description: 'Lambda used to start ECS Graphhopper Task',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/graphhopper-task-runner.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_14_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.seconds(120),
			environment: {
				CLUSTER_NAME: props.cluster.clusterName,
				TASK_DEFINITION_NAME: props.taskDefinition.taskDefinitionArn,
				SUBNETS: props.vpc.publicSubnets.map(q => q.subnetId).join(','),
				SECURITY_GROUP: props.securityGroup.securityGroupId,
				CONTAINER_NAME: props.containerDefinition.containerName,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'ecs:RunTask',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						props.taskDefinition.taskDefinitionArn,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'iam:PassRole',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						props.taskExecutionRole.roleArn,
						props.taskDefinitionRole.roleArn,
					],
				}),
			],
		})
	}
}
