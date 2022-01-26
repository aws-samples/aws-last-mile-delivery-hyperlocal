# `@prototype/appconfig`

This package defines all the resources for the App configuration.

## Resources created

* AppConfig (SSM)
  * DeliveryApp - Application
  * CustomerApp - Application
  * DriverAppDev - Environment
  * DriverAppProd - Environment
  * CustomerAppDev - Environment
  * DriverApp config - Hosted Config Profile + 1st version
  * DriverApp Immediate Deployment - Deployment Strategy

* Storage
  * config S3 Bucket - stores latest versions of the configurations
  * policy attached to Cognito Authenticated role to access config bucket

* Lambda
  * deployment handler lambda - handles `StartDeployment` events

* Event bridge
  * event `Rule` to catch `StartDeployment` events from AppConfig

* Custom resource
  * to put config (initially deployed to hosted config) to S3 bucket

## Usage

```ts
import { AppConfigNestedStack } from '@prototype/appconfig'

// ...

const appConfig = new AppConfigNestedStack(this, 'AppConfigNestedStack', {
    deliveryAppConfig,
    cognitoAuthenticatedRole: authenticatedRole,
})
```
