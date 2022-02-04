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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Construct } from 'constructs'
import { NestedStack, NestedStackProps, aws_dynamodb as ddb, aws_events as events, aws_ec2 as ec2, aws_lambda as lambda, aws_elasticache as elasticache } from 'aws-cdk-lib'
import * as api from '@aws-play/cdk-apigateway'
import * as net from '@prototype/networking'
import { OrderManagerStack } from '@prototype/order-manager'

export interface OrderOrchestrationStackProps extends NestedStackProps {
	readonly demographicAreaProviderEngineSettings: ddb.ITable
	readonly orderTable: ddb.ITable
	readonly eventBus: events.EventBus
	readonly providersConfig: { [key: string]: any, }
	readonly providerApiUrls: {[key: string]: api.RestApi, }
	readonly vpc: ec2.IVpc
	readonly vpcNetworking: net.Networking
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }
	readonly redisCluster: elasticache.CfnCacheCluster
	readonly orderManagerSettings: { [key: string]: string | number | boolean, }
}

/**
 * Prototype ingestion stack
 */
export class OrderOrchestrationStack extends NestedStack {
	constructor (scope: Construct, id: string, props: OrderOrchestrationStackProps) {
		super(scope, id, props)
		const {
			orderTable,
			eventBus,
			providersConfig,
			providerApiUrls,
			vpcNetworking,
			vpc,
			lambdaLayers,
			redisCluster,
			orderManagerSettings,
			demographicAreaProviderEngineSettings,
		} = props

		const orderManager = new OrderManagerStack(this, 'OrderManagerStack', {
			orderTable,
			eventBus,
			providersConfig,
			providerApiUrls,
			vpcNetworking,
			privateVpc: vpc,
			lambdaLayers,
			redisCluster,
			orderManagerSettings,
			demographicAreaProviderEngineSettings,
		})
	}
}
