# Location service

Location service is the collection of various resources that support ingesting and maintaining information about couriers' locations that change through time.

Our approach to use location data is to keep them in _live data stores_ where the _latest_ update is maintained of the drivers. This enables us to access the most up-to-date information with very low latency. We solve this with two managed AWS services: Elasticache  (Redis) and ElasticSearch.


## Elasticache (Redis)

An Elasticache cluster with Redis engine enables us to access information fast. We keep driver location and status data in Redis key-value store.

In the following table we show how we keep the latest location and status data in memory:

| Store | Type | Data | Note |
| ---- | ---- | ---- | ---- |
| driver:loc:location | GeoHash | long/lat - driverId | Driver's location in a searchable structure |
| driver:loc:ttls | Sorted set | timestamp - driverId | Latest timestamp + TTL seconds |
| driver:loc:raw  | Hash | driverId - _raw json data_ | DriverId indexed raw incoming data |
| driver:stat:status | Hash | driverId - status | Latest status of the driver |
| driver:stat:updated | Hash | driverId - timestamp | Latest status reported timestamp |
| geofence:location | GeoHash | long/lat - driverId | Location for a driver Id |

Current implementation deploys a Redis Cluster in Elasticache, with one instance. We highly recommend to deploy a `ReplicaSet` for Redis with multiple **READ** nodes.
Once read nodes are operational, lambda functions (and other processes) that only perform read operations (e.g. queries) should use the endpoints of the read-replicas, while other lambda functions (and other processes) that perform write/delete operations should use the master nodes' endpoints.

For further performance enhancements, we recommend to run multiple load tests to find a proper balance between redis read/write performance and number of drivers/orders in the system and find the right instance size for the nodes.

## Elasticsearch

An ElasticSeach cluster enables us to store drivers' location and status updates in an indexed format, so we can perform complicated geo-queries and build isochrones in the future phases.

We define one index, `driver-location`, with an initial mapping for a `location` field as `geo_point` type. This initial mapping setup is performed in a custom resource lambda function and is ran once the OPENSEARCH Domain has been deployed and available (see `packages/live-data-chache` ESSetup construct and lambda implementation).

The index holds the following data structure:
* _id: \<driverId\> `string`
* _index: `'driver-location'`
* _type: `'_doc'`
* driverId: `string`
* driverIdentity: `string`
* elevation: `number`
* location: { lat, lon } `geo_point`
* spoofing_detected: `boolean`
* status: `string`
* timestamp: `number`
* ttl: `number`

For performance enhancements, we recommend to run multiple load tests to find a proper balance between response times and number of drivers/orders in the system and find the right instance size for the nodes. Also, pay attention to the EBS volumes used for the instances, since higher IOPS volumes will perform significantly better.
### Development

For development purposes, you can use _Kibana_ to inspect and use its dev tools. To setup access to Kibana in your _DEV_ account, we provided [step-by-step instructions](../../docs/development/ssh-tunnel/kibana-access.md) to follow.

## Lambda handlers

Drivers are periodically capturing the location of their mobile device and also their status, and sending it to the cloud via MQTT messages, which are ingested with Kinesis Data Streams (KDS).
To handle these messages and use it in the system, we set up _Lambda functions_ as the KDS consumers.

### Kinesis consumers

Lambda functions that handle streaming data from Kinesis Data Streams, are setup with a Kinesis trigger, that enables us to set _Batch size_ (the largest number of records that will be read from your stream at once) and a _Batch window_ (the maximum amount of time to gather records before invoking the function, in seconds). These two parameters will determine how often a lambda function will be triggered for execution. To set these parameters correctly, we recommend to run various load tests with different number of drivers and orders in the system and compare metrics such as parallel lambda executions, kinesis record age, etc, and choose the appropriate parameters.

Once it is determined what metrics are crucial for your operation, you can setup _Cloudwatch Alerts_ that can trigger automations to set these parameters dynamically, depending on the system load (e.g. high number of drivers in the system) or schedules (e.g. pre-defined _peak hours_ during the day where more drivers/orders are present).

The prototype comes with two **Kinesis Consumers**: **Geofencing** and **Driver Location Ingest**. Both consumers are part of the Location Service and they compute the driver location update events for two different reasons.

Both consumers are implemented to use enhanced fan-out (based on a configuration flag) to read the data from the stream. Inside the CDK there are parameters that can be utilised to change the behaviour of single consumer. Disable the enhanced fan-out or change the number of records that are handled by the Lambda.

#### Geofencing consumers

The Geofencing consumers takes the incoming events and verify if there's an active geofencing activity for that specific driver; if that's the case, it will verify whether any of the events have crossed the geofencing boundaries and thus send a message to Event Bridge if is the case. 

CDK parameters that can be adjusted to change the behaviour of the consumer:

- `driverLocationUpdateBatchSize=50`, define the number of record to consume at once
- `driverLocationUpdateParallelizationFactor=5`, define the number of parallel lambda that are executed (max 10)
- `driverLocationUpdateRetryAttempts=20`, define the retries attempt before the message goes in a dead letter queue
- `driverLocationUpdateUseFanOutConsumer=true`, implement dedicated throughput mode instead of shared
- `driverLocationUpdateMaxBatchingWindowMs=5000`, define the batch window after which events will be consumed (even if the size is not yet reached)

#### Driver Location Ingest

Driver Location Ingest instead, takes the incoming events and update Amazon Elasticache (Redis) and Amazon ElasticSearch with the new location data so that subsequent API Calls to the Location Service to query drivers will get the updated information.

Both write query on Redis and ElasticSearch are performed as batch to improve overall performance.

CDK parameters that can be adjusted to change the behaviour of the consumer:

- `geofencingBatchSize=50`, define the number of record to consume at once
- `geofencingParallelizationFactor=5`, define the number of parallel lambda that are executed (max 10)
- `geofencingRetryAttempts=5`, define the retries attempt before the message goes in a dead letter queue
- `geofencingUseFanOutConsumer=true`, implement dedicated throughput mode instead of shared
- `geofencingMaxBatchingWindowMs=500`, define the batch window after which events will be consumed (even if the size is not yet reached)

### `LOCATION_UPDATE` message lambda handler

This lambda handler is handling `LOCATION_UPDATE` messages originated from the drivers. After data validation, it will perform the following sequence:

1. Add/update long/lat for a driverId in the `driver:loc:location` Redis GeoHash
2. Add/update a TTL timestamp for a driverId in the `driver:loc:ttls` Redis Sorted set
3. Add/update the ingested _JSON_ data for a driverId in the `driver:loc:raw` Redis Hash
4. Add/update the ingested _JSON_ data for a driverId in the `driver-location` ElasicSearch index

### `STATUS_CHANGE` message lambda handler

This lambda handler is handling `DRIVER_STATUS_UPDATE` messages originated from the drivers. After data validation, it will perform the following sequence:

1. Update driver's status in the `driver:stat:status` Redis hash
2. Update driver's status timestamp in the `driver:stat:updated` Redis hash
3. Update driver's status _and_ timestamp in the `driver-location` ElasticSearch index
4. Push an `DRIVER_STATUS_CHANGE` event to EventBridge

### Geofencing lambda

Setting another stream to check if the incoming location data stream may be part of temporarily set up _local_ geofences (to support "arrive to restaurant" and "arrive to customer" use cases), this lambda handler is processing every single location that was captured in the driver's mobile app. The following sequence is performed:

1. Look up active geofences associated with the driver. If there are none, driver is skipped
2. Check the distance for each location and each geofence,
   1. if the distance is shorter than `radius`, `GEOFENCE_ENTER` event is placed on event bridge
   2. if distance is larger than `radius` (and already inside geofence), `GEOFENCE_EXIT` event is placed on event bridge
3. Add/update `geofence:oocation:status` Redis hash

### Keeping data up-to-date

We prepare the system for edge-cases where drivers are not able to sign-out, for reasons like their battery ran out of power or they are in an area where internet coverage is not available for their mobile providers.
The `DriverLocationCleanupLambda` lambda function is setup to run once every minute, with the following sequence:

1. Check if there are any drivers who haven't reported for TTL amount of time: lookup all drivers from `driver:loc:ttls` Redis sorted set (between -infinity and now)
2. Remove those drivers from `driver:loc:ttls` redis sorted set, from `driver:loc:location` redis geohash, and also from `driver:loc:raw` redis hash.
3. [Current implementation] Remove those drivers from `driver:stat:status` and `driver:stat:updated` redis hashes
4. [Current implementation] Remove those drivers from `driver-location` Elasticsearch index

**[Recommended implementation:]** Update those drivers' status to `OFFLINE` in `driver:stat:status` redis hash and in `driver-location` OPENSEARCH index.


## Queries

The location service provides a RESTful API to query drivers for the following use cases:

* Query driver by ID - return the last location the driver reported in the system
* Query drivers around a location
  * lat/long with radius of a circle - return the list of drivers with their last location reported, and distance from the query location
  * lat/long with side of a rectangle - return the list of drivers with their last location reported, and distance from the query location`*`
* Query drivers available in an area - return drivers located inside a defined polygon

`*` - Currently not supported by Elasticache. This functionality is available from Redis `v6.2`, however Elasticache runs Redis `v6.0.5` at the time of writing this document.

