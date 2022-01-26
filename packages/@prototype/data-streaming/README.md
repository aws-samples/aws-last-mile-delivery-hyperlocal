# `@prototype/data-streaming`

Data streaming resources.

This package creates the following resources:

1. `DriverDataIngestStream` - Kinesis Data Stream, which ingests the data streamed from IoT Basic Ingest
2. `drivers-telemetry` - Kinesis Firehose Delivery Stream, that is taking the stream from Kinesis Data Stream and batches the data up to 128MB chuncks (or up to 900 seconds) and saves it to the drivers telemetry S3 bucket
    *  `firehose-to-s3` IAM role, that provides access to the delivery stream to write objects into the S3 bucket

## Usage

```ts
import { KinesisDS, KinesisFirehoseStack } from '@prototype/data-streaming'

const driverDataStream = new KinesisDS(this, 'DriverDataStream', {
    dataStreamRetention: Duration.hours(kinesisConfig.dataStreamRetentionHrs as number),
    shardCount: kinesisConfig.shardCount as number,
})

const driverFirehose = new KinesisFirehoseStack(this, 'DriverFirehose', {
    kinesisStream: driverDataStream.driverDataIngestStream,
    driversTelemetryBucket,
})

```
