# Data Ingestion

The Data Ingestion is performed by using AWS IoT Core. AWS IoT Core provides a cost effective mechanism to ingest large amount of data into AWS and, at the same time, by leveraging on MQTT protocol it provides two-way communication between the client application and the AWS Cloud.

The data is ingested into AWS IoT by using [basic ingest](https://docs.aws.amazon.com/iot/latest/developerguide/iot-basic-ingest.html), which helps on keeping the cost under control by publishing the messages directly to the IoT Rules that have been created. The prototype simulate two type of incoming data: location update events and driver status change.

## Location update events

The location update events are sent to a AWS IoT Rule (**devproto_ingestion_rule**) with a frequency and interval that vary based on the configured parameters. One single message could contain multiple location update events which contain location data (latitude, longitude and elevation) plus a flag that identity whether the specific event has been spoofed. 

The AWS IoT Rule has an action to forward the incoming events into Amazon Kinesis which can handle the large amount of events and batch them, based on the provided configuration, for end consumer to perform the required elaboration.

## Driver Status Updates

An additional AWS IoT Rule (**devproto_driver_status_update**) is used to capture driver status change events. Whenever a driver change status during a delivery (eg. from `IDLE` to `PICKING_UP_GOODS`), the simulator sends a message to AWS IoT Core using the specific rule which eventually invokes an AWS Lambda function that handle the incoming message and updates Amazon Elasticache (Redis) and Amazon ElasticSearch with the new status before forwarding the message to Amazon EventBridge.

The message in EventBridge is subscribed by downstream services (eg. Order Service) and used to handle other system changes such as Order Status change or starting Geofencing tracking for that specific driver.

The prototype uses this approach to send the message to the AWS Cloud, but the system can be extended to expose the driver status update AWS Lambda through an API Gateway to provide a REST interface for the driver application to consume.
