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
import { Duration, aws_events as events, aws_dynamodb as ddb, aws_kinesis as kinesis } from 'aws-cdk-lib'
import { WebhookProviderBase } from '@prototype/provider'
import { VpcLambdaProps } from '@prototype/lambda-common'
import { InternalProviderCallbackLambda } from './lambdas/InternalProviderCallback'
import { RequestOrderFulfillmentLambda } from './lambdas/RequestOrderFulfillment'
import { CancelOrderLambda } from './lambdas/CancelOrder'
import { GetOrderStatusLambda } from './lambdas/GetOrderStatus'
import { namespaced } from '@aws-play/cdk-core'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InternalWebhookProviderProps extends VpcLambdaProps {
	readonly internalWebhookProviderSettings: { [key: string]: string | number | boolean, }
	readonly eventBus: events.IEventBus
	readonly internalProviderOrders: ddb.ITable
}

export class InternalWebhookProvider extends WebhookProviderBase {
	public readonly orderBatchStream: kinesis.IStream

	constructor (scope: Construct, id: string, props: InternalWebhookProviderProps) {
		const {
			internalWebhookProviderSettings,
			eventBus,
			vpc,
			lambdaSecurityGroups,
			layers,
			internalProviderOrders,
		} = props

		// create kinesis DS
		const orderBatchStream = new kinesis.Stream(scope, 'DriverDataIngestStreamId', {
			streamName: namespaced(scope, 'OrderBatchStream'),
			retentionPeriod: Duration.hours(internalWebhookProviderSettings.dataStreamRetentionHrs as number),
			shardCount: internalWebhookProviderSettings.shardCount as number,
		})

		const callbackLambdaHandler = new InternalProviderCallbackLambda(scope, 'InternalWebhookProvider-InternalCallbackLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer],
			},
		})

		const requestOrderFulfillmentLambda = new RequestOrderFulfillmentLambda(scope, 'InternalWebhookProvider-RequestOrderFulfillmentLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer],
				orderBatchStream,
				internalProviderOrders,
			},
		})

		const getOrderStatusLambda = new GetOrderStatusLambda(scope, 'InternalWebhookProvider-GetOrderStatusLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer],
				internalProviderOrders,
			},
		})

		const cancelOrderLambda = new CancelOrderLambda(scope, 'InternalWebhookProvider-CancelOrderLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer],
				internalProviderOrders,
			},
		})

		super(scope, id, {
			name: 'InternalWebhookProvider',
			providerSettings: internalWebhookProviderSettings,
			baseHandlers: {
				requestOrderFulfillmentLambda,
				getOrderStatusLambda,
				cancelOrderLambda,
			},
			callback: {
				httpMethod: 'POST',
				lambdaHandler: callbackLambdaHandler,
				resourcePath: '/callback',
			},
		})

		this.orderBatchStream = orderBatchStream
	}
}
