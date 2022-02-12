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
import { NestedStack, NestedStackProps, Duration, aws_s3 as s3 } from 'aws-cdk-lib'
import { KinesisDS, KinesisFirehoseStack } from '@prototype/data-streaming'

export interface StreamingStackProps extends NestedStackProps {
	readonly driversTelemetryBucket: s3.IBucket
	readonly kinesisConfig: { [key: string]: string | number | boolean, }
}

/**
 * Prototype ingestion stack
 */
export class StreamingStack extends NestedStack {
	public readonly kinesisDataStreams: KinesisDS

	public readonly kinesisFirehoseStack: KinesisFirehoseStack

	constructor (scope: Construct, id: string, props: StreamingStackProps) {
		super(scope, id, props)

		const {
			driversTelemetryBucket,
			kinesisConfig,
		} = props

		this.kinesisDataStreams = new KinesisDS(this, 'DriverDataStream', {
			dataStreamRetention: Duration.hours(kinesisConfig.dataStreamRetentionHrs as number), // PROD: review this value
			shardCount: kinesisConfig.shardCount as number,
		})

		const driverFirehose = new KinesisFirehoseStack(this, 'DriverFirehose', {
			driverDataIngestStream: this.kinesisDataStreams.driverDataIngestStream,
			driversTelemetryBucket,
		})
	}
}
