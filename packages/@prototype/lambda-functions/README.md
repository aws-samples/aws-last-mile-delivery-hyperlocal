# `@prototype/lambda-functions`

Implementations of lambda handlers for catching various events from the system.

## Lambda Handlers

### DriverLocationUpdateIngestLambda

This function handles `LOCATION_UPDATE` messages originating from the driver's app (simulator). After validation, it'll take the latest location and update Redis and OpenSearch. It also creates a `TTL` value for drivers (`timestamp + 120 seconds`) and stores it.

Triggered by Kinesis Data Stream.

### DriverStatusUpdateIngestLambda

This function handles `STATUS_UPDATE` messages originating from the driver's app (simulator). After validation, it'll update Redis and OpenSearch.

Triggered by Kinesis Data Stream.

### DriverLocationCleanupLambda

This function observes the current status of Redis and OpenSearch. If a driver doesn't send an update by `TTL` value, it means driver is offline/not reachable, so this lambda will cleanup the driver's related records from both Redis and OpenSearch.

Triggered by Cloudwatch, once a minute.

`Note:`: Currently it removes the elements, in PROD you'd want to change it to update drivers' status to `OFFLINE`.

### DriverGeofencingLambda

This function handles `LOCATION_UPDATE` messages originating from the driver's app (simulator). After validation, it'll take the _all_ location entries from the message and checks the driver against active geofences. If there is an entry/exit event, it'll publish an event to Event bridge.

Triggered by Kinesis Data Stream.

### KinesisConsumer

Based on parameters, it'll register a "regular" kinesis event source or an enhanced fan out consumer for a data stream.

## Usage

```ts
import { LambdaFunctions } from '@prototype/lambda-functions';

const lambdaFunctions = new LambdaFunctions(this, 'LambdaFunctions', {
    vpc,
    lambdaSecurityGroups: [securityGroups.lambda],
    memoryDBCluster,
    lambdaLayers,
    cleanupScheduleMins: 1,
    driverDataIngestStream: driverDataStream.driverDataIngestStream,
    driverLocationUpdateTTLInMs: memoryDBConfig.driverLocationUpdateTTLInMS as number,
    openSearchDomain: openSearchCluster,
    eventBus,
    geofencingBatchSize: kinesisConfig.geofencingBatchSize as number,
    geofencingParallelizationFactor: kinesisConfig.geofencingParallelizationFactor as number,
    geofencingRetryAttempts: kinesisConfig.geofencingRetryAttempts as number,
    geofencingUseFanOutConsumer: kinesisConfig.geofencingUseFanOutConsumer as boolean,
    geofencingMaxBatchingWindowMs: kinesisConfig.geofencingMaxBatchingWindowMs as number,
    driverLocationUpdateBatchSize: kinesisConfig.driverLocationUpdateBatchSize as number,
    driverLocationUpdateParallelizationFactor: kinesisConfig.driverLocationUpdateParallelizationFactor as number,
    driverLocationUpdateRetryAttempts: kinesisConfig.driverLocationUpdateRetryAttempts as number,
    driverLocationUpdateUseFanOutConsumer: kinesisConfig.driverLocationUpdateUseFanOutConsumer as boolean,
    driverLocationUpdateMaxBatchingWindowMs: kinesisConfig.driverLocationUpdateMaxBatchingWindowMs as number,
})
```
