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
import * as events from '@aws-cdk/aws-events'
import * as eventsTarget from '@aws-cdk/aws-events-targets'
import * as ddb from '@aws-cdk/aws-dynamodb'
import * as lambda from '@aws-cdk/aws-lambda'
import * as step from '@aws-cdk/aws-stepfunctions'
import * as api from '@aws-cdk/aws-apigateway'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as elasticache from '@aws-cdk/aws-elasticache'
import { Networking } from '@prototype/networking'
import { SERVICE_NAME } from '@prototype/common'
import { OrderManagerHandlerLambda } from './OrderManagerHandler'
import { namespaced } from '@aws-play/cdk-core'
import { OrderManagerStepFunction } from './OrderManagerStepFunction'
import { OrderManagerHelperLambda } from './OrderManagerHelper'
import { ProviderRuleEngineLambda } from './ProviderRuleEngine'

export interface OrderManagerStackProps {
	readonly eventBus: events.EventBus
	readonly demographicAreaProviderEngineSettings: ddb.ITable
	readonly orderTable: ddb.ITable
	readonly providersConfig: { [key: string]: any, }
	readonly providerApiUrls: {[key: string]: api.RestApi, }
	readonly privateVpc: ec2.IVpc
	readonly vpcNetworking: Networking
	readonly redisCluster: elasticache.CfnCacheCluster
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }
	readonly orderManagerSettings: { [key: string]: string | number | boolean, }
}

export class OrderManagerStack extends cdk.Construct {
	public readonly orderManagerHandler: lambda.Function

	public readonly orderManagerHelper: lambda.Function

	public readonly orderManagerStepFunction: step.StateMachine

	constructor (scope: cdk.Construct, id: string, props: OrderManagerStackProps) {
		super(scope, id)

		const {
			eventBus,
			orderTable,
			providersConfig,
			providerApiUrls,
			privateVpc,
			vpcNetworking,
			redisCluster,
			lambdaLayers,
			orderManagerSettings,
			demographicAreaProviderEngineSettings,
		} = props

		this.orderManagerHelper = new OrderManagerHelperLambda(this, 'OrderManagerHelper', {
			dependencies: {
				orderTable,
				eventBus,
				privateVpc,
				vpcNetworking,
				redisCluster,
				lambdaLayers,
			},
		})
		const providerRuleEngine = new ProviderRuleEngineLambda(this, 'ProviderRuleEngine', {
			dependencies: {
				providersConfig,
				providerApiUrls,
				demographicAreaProviderEngineSettings,
			},
		})

		const orderManager = new OrderManagerStepFunction(this, 'OrderManagerStepFunction', {
			orderManagerHelper: this.orderManagerHelper,
			providerRuleEngine,
			orderManagerSettings,
		})

		this.orderManagerStepFunction = orderManager.stepFunction

		this.orderManagerHandler = new OrderManagerHandlerLambda(this, 'OrderManagerHandler', {
			dependencies: {
				orderTable,
				privateVpc,
				vpcNetworking,
				redisCluster,
				lambdaLayers,
				orderOrchestrator: this.orderManagerStepFunction,
			},
		})

		new events.Rule(this, 'OrdersEventConsumer', {
			ruleName: namespaced(this, 'orders-to-order-manager'),
			description: 'Rule used by order manager to consume new incoming orders',
			eventBus,
			enabled: true,
			targets: [new eventsTarget.LambdaFunction(this.orderManagerHandler)],
			eventPattern: {
				source: [SERVICE_NAME.ORDER_SERVICE],
				detailType: ['NEW_ORDER'],
			},
		})

		new events.Rule(this, 'RestaurantEventConsumer', {
			ruleName: namespaced(this, 'restaurant-to-order-manager'),
			description: 'Rule used by order manager to consume restaurant ack events',
			eventBus,
			enabled: true,
			targets: [new eventsTarget.LambdaFunction(this.orderManagerHandler)],
			eventPattern: {
				source: [SERVICE_NAME.RESTAURANT_SERVICE],
				detailType: ['RESTAURANT_ORDER_ACK'],
			},
		})

		new events.Rule(this, 'ProviderEventConsumer', {
			ruleName: namespaced(this, 'provider-to-order-manager'),
			description: 'Rule used by order manager to consume provider update events',
			eventBus,
			enabled: true,
			targets: [new eventsTarget.LambdaFunction(this.orderManagerHandler)],
			eventPattern: {
				source: [
					SERVICE_NAME.EXAMPLE_POLLING_PROVIDER_SERVICE,
					SERVICE_NAME.EXAMPLE_WEBHOOK_PROVIDER_SERVICE,
					SERVICE_NAME.INTERNAL_WEBHOOK_PROVIDER_SERVICE,
				],
				detailType: ['ORDER_UPDATE'],
			},
		})
	}
}
