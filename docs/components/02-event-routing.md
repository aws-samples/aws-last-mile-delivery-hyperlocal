# Global Event Routing

The prototype include a **Global Event Routing** that is used to handle incoming messages from the client and ingest them effectively to both support the scale and allow downstream services to integrate easily without requiring extra integration work.

The prototype aim to provide an **event-sourcing** based architecture which provide the ability to decouple service-to-service integration and avoid tight integration between components. As such, Amazon EventBridge is used to provide an event-bus where applications can publish messages (events) and consumers can subscribe to what's relevant for them and react upon receiving it.

## Kinesis

**Amazon Kinesis** is utilised to ingest large amount of data coming from the driver application (location update events) and it's consumed by the Location Service components to index and store the current driver location in order to allow other services to query the drivers. In Amazon Kinesis, each shard supports 1,000 records per second for writes (up to a maximum total data write rate of 1 MB per second) and 2 MB per second as total data read rate. To support the required scale is advised to create as many shards as the application requires.

By default, the operations in the shards are doing using shared throughput mode that support up to 5 transactions per second for reads (200ms latency) and 2MB as data read rate. Nevertheless, if your application requires better performance, Amazon Kinesis supports dedicated throughput (Enhanced Fan-Out) which allow consumers to have a dedicated throughput of up to 2 MB of data per second per shard and a latency of 70ms (~65% faster delivery compared to shared throughput mode).

The prototype comes with two Kinesis Consumers: **Geofencing** and **Driver Location Ingest**. Both consumers are part of the Location Service and they compute the driver location update events for two different reasons. The **Geofencing** consumers takes the incoming events and verify if there's an active geofencing activity for that specific driver; if that's the case, it will verify whether any of the events have crossed the geofencing boundaries and thus send a message to Event Bridge if is the case. **Driver Location Ingest** instead, takes the incoming events and update Amazon MemoryDB (Redis) and Amazon OpenSearch with the new location data so that subsequent API Calls to the Location Service to query drivers will get the updated information.

## EventBridge

To provide an easy way to decouple service-to-service integration, the prototype uses Amazon EventBridge to create an event-sourcing based architecture. The messages going to EventBridge can be subscribed by multiple consumers that decide how to act upon receiving these messages. This prevent services to integrate between each other with multiple API calls while it allows to extend with new functionalities easily (by creating new consumers).

The prototype uses EventBridge in a few components: **Goefencing** and **Driver Status Update**. **Goefencing** uses EventBridge extensively and sends messages for the following use cases: geofence start, geofence stop, geofence enter, geofence exit. This events are subscribed by other services and perform certain logic required by the given scenario; for example, `geofence exit` event trigger a geofence delete action which stops to track that given driver for geofence activity. While other events such as `geofence enter` (or also `geofence exit`) trigger notification messages that enable the consumers to send email/sms/push notifications to the target (customer / restaurant) which enables the option to notify customer / restaurant on approaching drivers.

**Driver Status Update** also uses EventBridge to publish events when the driver change status (for example from `IDLE` to `PICKING_UP_GOODS`), these events are consumed by the Order Service (mock for the prototype) to update the status of the given order accordingly.