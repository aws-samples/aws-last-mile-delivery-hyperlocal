# `@prototype/lambda-common`

Common variables and functions for lambdas.

* Lambda layers - these layers are used in various lambda functions to simplify using dependencies
  * OpenSearchClientLayer - opensearch client library in a lambda layer
  * RedisClientLayer - redis client library in a lambda layer
  * LambdaUtils - common variables and functions in a lambda layer

* Policy helper functions
  * OpenSearchPolicies - opensearch read/write/delete policy statements
  * TablePolicy - dynamodb read/write/delete policy statements

## Usage

```ts
import { LambdaUtilsLayer, OpenSearchClientLayer, RedisClientLayer, LambdaInsightsLayer } from '@prototype/lambda-common'

const { lambdaUtilsLayer } = new LambdaUtilsLayer(this, 'LambdaUtilsLayer', {})
const { redisClientLayer } = new RedisClientLayer(this, 'RedisClientLayer', {})
const { openSearchClientLayer } = new OpenSearchClientLayer(this, 'OpenSearchClientLayer', {})
const lambdaInsightsLayer = LambdaInsightsLayer(this, 'LambdaInsightLayer')

const lambdaLayers = {
    lambdaUtilsLayer,
    redisClientLayer,
    opensearchClientLayer,
    lambdaInsightsLayer,
}

// ....
const apiGeotracking = new ApiGeoTracking(this, 'ApiGeoTracking', {
    restApi,
    userPool,
    lambdaLayers, // <----------
    vpc,
    lambdaSecurityGroups: [securityGroups.lambda],
    memoryDBCluster,
    geoPolygonTable,
    openSearchDomain: elasticSearchCluster,
})

```
