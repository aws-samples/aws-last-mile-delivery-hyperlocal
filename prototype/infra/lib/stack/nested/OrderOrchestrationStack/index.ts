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
import { Construct, NestedStack, NestedStackProps } from '@aws-cdk/core'
import * as ddb from '@aws-cdk/aws-dynamodb'
import * as events from '@aws-cdk/aws-events'
import * as api from '@aws-play/cdk-apigateway'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as lambda from '@aws-cdk/aws-lambda'
import * as net from '@prototype/networking'
import * as redis from '@aws-cdk/aws-elasticache'
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
	readonly redisCluster: redis.CfnCacheCluster
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
