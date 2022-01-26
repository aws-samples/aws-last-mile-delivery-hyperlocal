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
import { Stream, IStream } from '@aws-cdk/aws-kinesis'
import { namespaced } from '@aws-play/cdk-core'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface KinesisDSProps {
    readonly dataStreamRetention: Duration
	readonly shardCount: number
}

export class KinesisDS extends Construct {
	readonly driverDataIngestStream: IStream

	constructor (scope: Construct, id: string, props: KinesisDSProps) {
		super(scope, id)

		const { dataStreamRetention, shardCount } = props

		const ingestDataStream = new Stream(this, 'DriverDataIngestStreamId', {
			retentionPeriod: dataStreamRetention,
			streamName: namespaced(this, 'DriverDataIngestStream'),
			shardCount,
		})

		this.driverDataIngestStream = ingestDataStream
	}
}
