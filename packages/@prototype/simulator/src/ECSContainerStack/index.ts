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
import { aws_ecs as ecs, aws_ecr as ecr, aws_s3 as s3, aws_iot as iot, aws_iam as iam, aws_dynamodb as ddb, aws_ec2 as ec2, custom_resources as cr, aws_cognito as cognito } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { SimulatorContainer } from './SimulatorContainer'

interface ECSContainerStackProps {
	readonly userPool: cognito.UserPool
	readonly identityPool: cognito.CfnIdentityPool
	readonly userPoolClient: cognito.UserPoolClient
	readonly iotIngestionRule: iot.CfnTopicRule
	readonly iotDriverStatusRule: iot.CfnTopicRule
	readonly iotCustomerStatusRuleName: string
	readonly iotRestaurantStatusRuleName: string
	readonly iotDriverPolicy: iot.CfnPolicy
	readonly ecsVpc: ec2.IVpc
	readonly simulatorConfig: { [key: string]: string | number, }
	readonly configBucket: s3.IBucket
	readonly configBucketKey: string

	readonly restaurantTable: ddb.Table
	readonly restaurantAreaIndex: string
	readonly restaurantExecutionIdIndex: string
	readonly restaurantUserPassword: string

	readonly customerTable: ddb.Table
	readonly customerAreaIndex: string
	readonly customerExecutionIdIndex: string
	readonly customerUserPassword: string
}

export class ECSContainerStack extends Construct {
	public readonly repository: ecr.Repository

	public readonly cluster: ecs.Cluster

	public readonly driverSimulator: SimulatorContainer

	public readonly customerSimulator: SimulatorContainer

	public readonly restaurantSimulator: SimulatorContainer

	constructor (scope: Construct, id: string, props: ECSContainerStackProps) {
		super(scope, id)

		this.cluster = new ecs.Cluster(this, 'ECSSimulatorCluster', {
			clusterName: namespaced(this, 'simulator'),
			vpc: props.ecsVpc,
			containerInsights: true,
		})

		// repo to store docker image
		this.repository = new ecr.Repository(this, 'SimulatorCommonRepository', {
			repositoryName: namespaced(this, 'simulator-repository'),
			imageScanOnPush: true,
		})

		const getIoTEndpoint = new cr.AwsCustomResource(this, 'IoTEndpoint', {
			onCreate: {
				service: 'Iot',
				action: 'describeEndpoint',
				physicalResourceId: cr.PhysicalResourceId.fromResponse('endpointAddress'),
				parameters: {
					endpointType: 'iot:Data-ATS',
				},
			},
			policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
				resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
		})

		const iotEndpointAddress = getIoTEndpoint.getResponseField('endpointAddress')

		this.driverSimulator = new SimulatorContainer(this, 'DriverSimulatorContainer', {
			name: 'driver',
			cpu: 256,
			memoryMiB: 512,
			repository: this.repository,
			baseUsername: props.simulatorConfig.driverBaseUsername as string,
			iotEndpointAddress,
			...props,
		})

		this.customerSimulator = new SimulatorContainer(this, 'CustomerSimulatorContainer', {
			name: 'customer',
			cpu: 256,
			memoryMiB: 512,
			repository: this.repository,
			baseUsername: props.simulatorConfig.customerBaseUsername as string,
			iotEndpointAddress,
			...props,
			additionalENVs: {
				CUSTOMER_TABLE_NAME: props.customerTable.tableName,
				CUSTOMER_EXECUTIONID_INDEX: props.customerExecutionIdIndex,
				CUSTOMER_AREA_INDEX: props.customerAreaIndex,
				CUSTOMER_PASSWORD: props.customerUserPassword,
				CUSTOMER_STATUS_UPDATE_RULE_NAME: props.iotCustomerStatusRuleName,
			},
		})
		this.customerSimulator.taskDefinitionRole.addToPolicy(
			new iam.PolicyStatement({
				actions: [
					'dynamodb:UpdateItem',
					'dynamodb:Query',
				],
				effect: iam.Effect.ALLOW,
				resources: [
					props.customerTable.tableArn,
					`${props.customerTable.tableArn}/index/${props.customerExecutionIdIndex}`,
					`${props.customerTable.tableArn}/index/${props.customerAreaIndex}`,
				],
			}),
		)

		this.restaurantSimulator = new SimulatorContainer(this, 'RestaurantSimulatorContainer', {
			name: 'restaurant',
			cpu: 256,
			memoryMiB: 512,
			repository: this.repository,
			baseUsername: props.simulatorConfig.restaurantBaseUsername as string,
			iotEndpointAddress,
			...props,
			additionalENVs: {
				RESTAURANT_TABLE_NAME: props.restaurantTable.tableName,
				RESTAURANT_EXECUTIONID_INDEX: props.restaurantExecutionIdIndex,
				RESTAURANT_AREA_INDEX: props.restaurantAreaIndex,
				RESTAURANT_PASSWORD: props.restaurantUserPassword,
				RESTAURANT_STATUS_UPDATE_RULE_NAME: props.iotRestaurantStatusRuleName,
			},
		})
		this.restaurantSimulator.taskDefinitionRole.addToPolicy(
			new iam.PolicyStatement({
				actions: [
					'dynamodb:UpdateItem',
					'dynamodb:Query',
				],
				effect: iam.Effect.ALLOW,
				resources: [
					props.restaurantTable.tableArn,
					`${props.restaurantTable.tableArn}/index/${props.restaurantExecutionIdIndex}`,
					`${props.restaurantTable.tableArn}/index/${props.restaurantAreaIndex}`,
				],
			}),
		)
	}
}
