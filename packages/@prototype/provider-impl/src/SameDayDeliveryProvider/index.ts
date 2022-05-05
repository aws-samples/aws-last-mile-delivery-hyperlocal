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
import { aws_events as events, aws_dynamodb as ddb } from 'aws-cdk-lib'
import { WebhookProviderBase } from '@prototype/provider'
import { VpcLambdaProps } from '@prototype/lambda-common'
import { SameDayDeliveryProviderCallbackLambda } from './lambdas/SameDayDeliveryProviderCallback'
import { RequestOrderFulfillmentLambda } from './lambdas/RequestOrderFulfillment'
import { CancelOrderLambda } from './lambdas/CancelOrder'
import { GetOrderStatusLambda } from './lambdas/GetOrderStatus'

export interface SameDayDeliveryProviderProps extends VpcLambdaProps {
	readonly sameDayDeliveryProviderSettings: { [key: string]: string | number | boolean, }
	readonly eventBus: events.IEventBus
	readonly sameDayDeliveryProviderOrders: ddb.ITable
}

export class SameDayDeliveryProvider extends WebhookProviderBase {
	constructor (scope: Construct, id: string, props: SameDayDeliveryProviderProps) {
		const {
			sameDayDeliveryProviderSettings,
			eventBus,
			vpc,
			lambdaSecurityGroups,
			layers,
			sameDayDeliveryProviderOrders,
		} = props

		const callbackLambdaHandler = new SameDayDeliveryProviderCallbackLambda(scope, 'SameDayDeliveryProvider-InternalCallbackLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer],
			},
		})

		const requestOrderFulfillmentLambda = new RequestOrderFulfillmentLambda(scope, 'SameDayDeliveryProvider-RequestOrderFulfillmentLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer],
				sameDayDeliveryProviderOrders,
			},
		})

		const getOrderStatusLambda = new GetOrderStatusLambda(scope, 'SameDayDeliveryProvider-GetOrderStatusLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer],
				sameDayDeliveryProviderOrders,
			},
		})

		const cancelOrderLambda = new CancelOrderLambda(scope, 'SameDayDeliveryProvider-CancelOrderLambda', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [layers.lambdaUtilsLayer, layers.lambdaInsightsLayer],
				sameDayDeliveryProviderOrders,
			},
		})

		super(scope, id, {
			name: 'SameDayDeliveryProvider',
			providerSettings: sameDayDeliveryProviderSettings,
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
	}
}
