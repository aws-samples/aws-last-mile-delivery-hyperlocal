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
import { InstantDeliveryProviderCallbackLambda } from './lambdas/InstantDeliveryProviderCallback'
import { RequestOrderFulfillmentLambda } from './lambdas/RequestOrderFulfillment'
import { CancelOrderLambda } from './lambdas/CancelOrder'
import { GetOrderStatusLambda } from './lambdas/GetOrderStatus'
import { namespaced } from '@aws-play/cdk-core'

export interface InstantDeliveryProviderProps extends VpcLambdaProps {
	readonly instantDeliveryProviderSettings: { [key: string]: string | number | boolean, }
	readonly eventBus: events.IEventBus
	readonly instantDeliveryProviderOrders: ddb.ITable
}

export class InstantDeliveryProvider extends WebhookProviderBase {
	public readonly orderBatchStream: kinesis.IStream

	constructor (scope: Construct, id: string, props: InstantDeliveryProviderProps) {
		const {
			instantDeliveryProviderSettings,
			eventBus,
			vpc,
			lambdaSecurityGroups,
			layers,
			instantDeliveryProviderOrders,
		} = props

		// create kinesis DS
		const orderBatchStream = new kinesis.Stream(scope, 'DriverDataIngestStreamId', {
			streamName: namespaced(scope, 'OrderBatchStream'),
			retentionPeriod: Duration.hours(instantDeliveryProviderSettings.dataStreamRetentionHrs as number),
			shardCount: instantDeliveryProviderSettings.shardCount as number,
		})

		const callbackLambdaHandler = new InstantDeliveryProviderCallbackLambda(scope, 'InstantDeliveryProvider-InternalCallbackLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer],
			},
		})

		const requestOrderFulfillmentLambda = new RequestOrderFulfillmentLambda(scope, 'InstantDeliveryProvider-RequestOrderFulfillmentLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer],
				orderBatchStream,
				instantDeliveryProviderOrders,
			},
		})

		const getOrderStatusLambda = new GetOrderStatusLambda(scope, 'InstantDeliveryProvider-GetOrderStatusLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer],
				instantDeliveryProviderOrders,
			},
		})

		const cancelOrderLambda = new CancelOrderLambda(scope, 'InstantDeliveryProvider-CancelOrderLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer],
				instantDeliveryProviderOrders,
			},
		})

		super(scope, id, {
			name: 'InstantDeliveryProvider',
			providerSettings: instantDeliveryProviderSettings,
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
