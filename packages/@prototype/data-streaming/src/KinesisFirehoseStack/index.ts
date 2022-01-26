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
import * as iam from '@aws-cdk/aws-iam'
import * as s3 from '@aws-cdk/aws-s3'
import * as kinesis from '@aws-cdk/aws-kinesis'
import * as firehose from '@aws-cdk/aws-kinesisfirehose'
import { namespaced } from '@aws-play/cdk-core'

interface KinesisFirehoseStackProps {
	driversTelemetryBucket: s3.IBucket
	driverDataIngestStream: kinesis.IStream
}

export class KinesisFirehoseStack extends cdk.Construct {
	public readonly driverFirehoseDeliveryStream: firehose.CfnDeliveryStream

	constructor (scope: cdk.Construct, id: string, props: KinesisFirehoseStackProps) {
		super(scope, id)

		const driverFirehoseRole = new iam.Role(this, 'DriverFirehoseRole', {
			roleName: namespaced(this, 'firehose-to-s3-driver'),
			assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
		})

		driverFirehoseRole.node.addDependency(props.driverDataIngestStream)

		driverFirehoseRole.addToPolicy(new iam.PolicyStatement({
			resources: [
				props.driverDataIngestStream.streamArn,
			],
			actions: [
				'kinesis:DescribeStream',
				'kinesis:GetShardIterator',
				'kinesis:GetRecords',
				'kinesis:ListShards',
			],
			effect: iam.Effect.ALLOW,
		}))

		driverFirehoseRole.addToPolicy(new iam.PolicyStatement({
			resources: [
				props.driversTelemetryBucket.bucketArn,
				`${props.driversTelemetryBucket.bucketArn}/*`,
			],
			actions: [
				's3:AbortMultipartUpload',
				's3:GetBucketLocation',
				's3:GetObject',
				's3:ListBucket',
				's3:ListBucketMultipartUploads',
				's3:PutObject',
			],
			effect: iam.Effect.ALLOW,
		}))

		this.driverFirehoseDeliveryStream = new firehose.CfnDeliveryStream(this, 'DriversTelemetryDeliveryStream', {
			deliveryStreamName: namespaced(this, 'drivers-telemetry'),
			deliveryStreamType: 'KinesisStreamAsSource',
			kinesisStreamSourceConfiguration: {
				kinesisStreamArn: props.driverDataIngestStream.streamArn,
				roleArn: driverFirehoseRole.roleArn,
			},
			s3DestinationConfiguration: {
				bucketArn: props.driversTelemetryBucket.bucketArn,
				roleArn: driverFirehoseRole.roleArn,
				errorOutputPrefix: 'errors/',
				compressionFormat: 'GZIP',
				prefix: 'telemetry/',
				bufferingHints: {
					intervalInSeconds: 900,
					sizeInMBs: 128,
				},
			},
		})

		this.driverFirehoseDeliveryStream.node.addDependency(props.driverDataIngestStream)
		this.driverFirehoseDeliveryStream.node.addDependency(driverFirehoseRole)
	}
}
