# `@prototype/iot-ingestion`

IoT Core setup for data ingestion. We follow IoT Core Basic ingestion for cost effectiveness.

Resources created:

* `iot-rule-to-kinesis`: an IAM role to give access to IoT Core to put records into Kinesis Data Stream
* `ingestion_rule`: an IoT Topic Rule for ingesting messages from the driver app (simulator) - to forward data to Kinesis Data Stream
* `driver_status_update`: IoT Topic Rule for ingesting driver status updates - forwards events to a lambda handler
* `driver_policy`: IoT Policy setup for drivers

## Usage

```ts
import { IoTStack } from '@prototype/iot-ingestion'

const iotSetup = new IoTStack(this, 'IoTSetup', {
    kinesisStream: driverDataStream.driverDataIngestStream,
    driverStatusUpdateLambda: lambdaFunctions.driverStatusUpdateLambda,
})
```
