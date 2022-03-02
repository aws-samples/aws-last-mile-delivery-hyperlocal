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
import { aws_events as events, aws_sqs as sqs } from 'aws-cdk-lib'
import { MemoryDBCluster } from '@prototype/live-data-cache'
import { PollingProviderBase } from '@prototype/provider'
import { VpcLambdaProps } from '@prototype/lambda-common'
import { ExamplePollingLambda } from './lambdas/ExamplePolling'
import { RequestOrderFulfillmentLambda } from './lambdas/RequestOrderFulfillment'
import { CancelOrderLambda } from './lambdas/CancelOrder'
import { GetOrderStatusLambda } from './lambdas/GetOrderStatus'

export interface ExamplePollingProviderProps extends VpcLambdaProps {
	readonly pollingProviderSettings: { [key: string]: string | number, }
	readonly eventBus: events.IEventBus
	readonly externalProviderMockUrl: string
	readonly externalProviderSecretName: string
	readonly memoryDBCluster: MemoryDBCluster
}

export class ExamplePollingProvider extends PollingProviderBase {
	constructor (scope: Construct, id: string, props: ExamplePollingProviderProps) {
		const {
			pollingProviderSettings,
			eventBus,
			vpc,
			lambdaSecurityGroups,
			layers,
			externalProviderMockUrl,
			externalProviderSecretName,
			memoryDBCluster,
		} = props

		const pollingLambdaCreator = (queue: sqs.IQueue): ExamplePollingLambda => {
			return new ExamplePollingLambda(scope, 'ExamplePollingLambda', {
				dependencies: {
					eventBus,
					vpc,
					lambdaSecurityGroups,
					lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer, layers.redisClientLayer],
					pendingOrdersQueue: queue,
					externalProviderMockUrl,
					externalProviderSecretName,
					memoryDBCluster,
				},
			})
		}

		const requestOrderFulfillmentLambdaCreator = (queue: sqs.IQueue): RequestOrderFulfillmentLambda => {
			return new RequestOrderFulfillmentLambda(scope, 'ExamplePollingProvider-RequestOrderFulfillmentLambda', {
				dependencies: {
					eventBus,
					vpc,
					lambdaSecurityGroups,
					lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer, layers.redisClientLayer],
					pendingOrdersQueue: queue,
					externalProviderMockUrl,
					externalProviderSecretName,
					memoryDBCluster,
				},
			})
		}

		const getOrderStatusLambda = new GetOrderStatusLambda(scope, 'ExamplePollingProvider-GetOrderStatusLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer, layers.redisClientLayer],
				externalProviderMockUrl,
				externalProviderSecretName,
				memoryDBCluster,
			},
		})

		const cancelOrderLambda = new CancelOrderLambda(scope, 'ExamplePollingProvider-CancelOrderLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer, layers.redisClientLayer],
				externalProviderMockUrl,
				externalProviderSecretName,
				memoryDBCluster,
			},
		})

		super(scope, id, {
			name: 'ExamplePollingProvider',
			providerSettings: pollingProviderSettings,
			baseHandlers: {
				getOrderStatusLambda,
				cancelOrderLambda,
			},
			pollingLambdaCreator,
			requestOrderFulfillmentLambdaCreator,
		})
	}
}
