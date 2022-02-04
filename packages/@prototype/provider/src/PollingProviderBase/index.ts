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
import { Duration, aws_sqs as sqs, aws_lambda as lambda, aws_lambda_event_sources as lambda_event_sources } from 'aws-cdk-lib'
import { ProviderBase, ProviderBaseProps } from '../ProviderBase'
import { namespaced } from '@aws-play/cdk-core'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PollingProviderBaseProps extends ProviderBaseProps {
	pollingLambdaCreator: (queue: sqs.IQueue) => lambda.IFunction
	requestOrderFulfillmentLambdaCreator: (queue: sqs.IQueue) => lambda.IFunction
}

export class PollingProviderBase extends ProviderBase {
	readonly pollingLambda: lambda.IFunction

	readonly pendingOrdersQueue: sqs.Queue

	constructor (scope: Construct, id: string, props: PollingProviderBaseProps) {
		const {
			name,
			providerSettings,
			pollingLambdaCreator,
			requestOrderFulfillmentLambdaCreator,
		} = props

		const pendingOrderDlq = new sqs.Queue(scope, `PendingOrderDlq-${name}`, {
			queueName: namespaced(scope, `PendingOrderDlq-${name}.fifo`),
			fifo: true,
		})

		const pendingOrdersQueue = new sqs.Queue(scope, `PendingOrderQ-${name}`, {
			deadLetterQueue: {
				maxReceiveCount: providerSettings.dlqMaxReceiveCount as number,
				queue: pendingOrderDlq,
			},
			fifo: true,
			queueName: namespaced(scope, `PendingOrderQ-${name}.fifo`),
			visibilityTimeout: Duration.minutes(providerSettings.pendingOrderQueueVisibilityTimeoutInMins as number),
			deliveryDelay: Duration.seconds(providerSettings.deliveryDelayInSec as number),
		})

		const pendindOrderSqsEventSource = new lambda_event_sources.SqsEventSource(pendingOrdersQueue, {
			batchSize: providerSettings.sqsBatchSize as number,
			enabled: true,
		})

		const baseProps = {
			...props,
			baseHandlers: {
				requestOrderFulfillmentLambda: requestOrderFulfillmentLambdaCreator(pendingOrdersQueue),
				...props.baseHandlers,
			},
		}

		super(scope, id, baseProps)

		this.pendingOrdersQueue = pendingOrdersQueue
		this.pollingLambda = pollingLambdaCreator(pendingOrdersQueue)
		this.pollingLambda.addEventSource(pendindOrderSqsEventSource)
	}
}
