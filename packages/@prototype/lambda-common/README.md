# `@prototype/lambda-common`

Common variables and functions for lambdas.

* Lambda layers - these layers are used in various lambda functions to simplify using dependencies
  * ESClientLayer - elasticsearch client library in a lambda layer
  * RedisClientLayer - redis client library in a lambda layer
  * LambdaUtils - common variables and functions in a lambda layer

* Policy helper functions
  * ESPolicies - elastic search read/write/delete policy statements
  * TablePolicy - dynamodb read/write/delete policy statements

## Usage

```ts
import { LambdaUtilsLayer, ESClientLayer, RedisClientLayer, LambdaInsightsLayer } from '@prototype/lambda-common'

const { lambdaUtilsLayer } = new LambdaUtilsLayer(this, 'LambdaUtilsLayer', {})
const { redisClientLayer } = new RedisClientLayer(this, 'RedisClientLayer', {})
const { esClientLayer } = new ESClientLayer(this, 'ESClientLayer', {})
const lambdaInsightsLayer = LambdaInsightsLayer(this, 'LambdaInsightLayer')

const lambdaLayers = {
    lambdaUtilsLayer,
    redisClientLayer,
    esClientLayer,
    lambdaInsightsLayer,
}

// ....
const apiGeotracking = new ApiGeoTracking(this, 'ApiGeoTracking', {
    restApi,
    userPool,
    lambdaLayers, // <----------
    vpc,
    lambdaSecurityGroups: [securityGroups.lambda],
    redisCluster,
    geoPolygonTable,
    openSearchDomain: elasticSearchCluster,
})

```
