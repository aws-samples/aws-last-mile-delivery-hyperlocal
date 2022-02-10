# `@prototype/data-storage`

Persistent data storage nested stack.

## Resources

This package creates the following persistent resources.

### S3 buckets

1. `drivers-telemetry` - to store ingested driver location data
2. `dispatch-engine` - to store maps and configs for the dispatch engine

### DynamoDB tables

1. `geoPolygon` - to store polygons for complex driver search queries
2. `order` - to store information on incoming orders
3. `instant-delivery-provider-orders` - to store information on orders that are routed into the internal provider
4. `demAreaSettings` - to store demographic area settings for the dispatch engine
5. `demographic-area-provider-engine-settings` - to store demographic area settings for the provider rule engine
6. `instant-delivery-provider-locks` - table for implementing driver locking mechinanism

### ECS Cluster

This package creates a `Backend-ECS-Cluster` to support fargate tasks for the routing solution (ie Graphhopper).

## Seeding initial data to DDB tables

To seed certain DynamoDB tables at deployment-time with default data. The DB feeder will fill the demographic area settings tables, both for the provider rule engine and the dispatch engine. Additionally, it will setup a pre-defined set of areas in the geoPolygon table. Implementation is done via CDK custom resources.

## Usage

```
import { DataStoragePersistent } from '@prototype/data-storage'

const dataStorage = new DataStoragePersistent(this, 'DataStoragePersistent', {})
```
