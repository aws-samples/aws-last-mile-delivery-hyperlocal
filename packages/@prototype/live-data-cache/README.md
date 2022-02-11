# `@prototype/live-data-cache`

Resources holding live/recent data in the system.

* RedisCluster: an Elasticache Redis cluster with a redis subnet group. 
* OpenSearchCluster: an Elastic search domain setup in the VPC, spread to all availability zones, with a Kibana access via `InternalIdentityStack` cognito (for operators).
  * ESSetup is a custom resource that generates the initial index with custom mappings as the last phase of the deployment.

## Usage

```ts
import { LiveDataCache } from '@prototype/live-data-cache'

const liveDataCluster = new LiveDataCache(this, 'LiveDataCache', {
    elasticSearchClusterProps: {
        securityGroups: [securityGroups.redis],
        vpc,
        esConfig,
        identityPoolId,
        userPoolId,
        authenticatedUserRole: authenticatedRole,
        adminRole,
        lambdaLayers,
        lambdaSecurityGroups: [securityGroups.lambda],
    },
    redisClusterProps: {
        numNodes: 1,
        nodeType: redisConfig.instanceType as string,
        securityGroups: [securityGroups.redis],
        vpc,
    },
})
```
