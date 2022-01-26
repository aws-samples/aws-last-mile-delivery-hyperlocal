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
import { Construct, Duration } from '@aws-cdk/core'
import { IFunction, StartingPosition, EventSourceMapping } from '@aws-cdk/aws-lambda'
import { IStream, CfnStreamConsumer } from '@aws-cdk/aws-kinesis'
import { namespaced } from '@aws-play/cdk-core'
import { SqsDlq, KinesisEventSource } from '@aws-cdk/aws-lambda-event-sources'
import { Queue } from '@aws-cdk/aws-sqs'
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam'
import { Kinesis } from 'cdk-iam-actions/lib/actions'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface KinesisConsumerProps {
  readonly baseName: string
	readonly batchSize: number
	readonly parallelizationFactor: number
	readonly retryAttempts: number
	readonly useFanOutConsumer: boolean
	readonly maxBatchingWindowMs: number
	readonly lambda: IFunction
  readonly kinesisStream: IStream
}

export class KinesisConsumer extends Construct {
	constructor (scope: Construct, id: string, props: KinesisConsumerProps) {
		super(scope, id)

		const {
			batchSize,
			parallelizationFactor,
			retryAttempts,
			useFanOutConsumer,
			maxBatchingWindowMs,
			lambda,
			kinesisStream,
			baseName,
		} = props

		const dlqForKinesisEventSource = new Queue(this, `${baseName}Dlq`, {
			queueName: namespaced(this, `${baseName}Dlq`),
		})
		const sqsDlq = new SqsDlq(dlqForKinesisEventSource)

		if (useFanOutConsumer) {
			const streamConsumer = new CfnStreamConsumer(this, `${baseName}Consumer`, {
				consumerName: namespaced(this, `${baseName}Consumer`),
				streamArn: kinesisStream.streamArn,
			})

			lambda.addToRolePolicy(new PolicyStatement({
				effect: Effect.ALLOW,
				actions: [
					Kinesis.DESCRIBE_STREAM,
					'kinesis:DescribeStreamSummary',
					Kinesis.GET_RECORDS,
					Kinesis.GET_SHARD_ITERATOR,
					'kinesis:ListShards',
					Kinesis.LIST_STREAMS,
					'kinesis:SubscribeToShard',
				],
				resources: [streamConsumer.attrConsumerArn],
			}))

			new EventSourceMapping(this, `Kines${baseName}ToLambdaArn`, {
				eventSourceArn: streamConsumer.attrConsumerArn,
				target: lambda,
				// TODO: evaluate if to change to latest
				startingPosition: StartingPosition.TRIM_HORIZON,
				onFailure: sqsDlq,
				retryAttempts,
				batchSize,
				parallelizationFactor,
				maxBatchingWindow: Duration.millis(maxBatchingWindowMs),
			})
		} else {
			/// if there are not fanout-consumers created a classic event and use shared throughout
			const kinesisEventSource = new KinesisEventSource(kinesisStream, {
				// TODO: evaluate if to change to latest
				startingPosition: StartingPosition.TRIM_HORIZON,
				onFailure: sqsDlq,
				retryAttempts,
				batchSize,
				parallelizationFactor,
				maxBatchingWindow: Duration.millis(maxBatchingWindowMs),
			})

			lambda.addEventSource(kinesisEventSource)
		}
	}
}
