# `@prototype/cognito-auth`

System wide a8n.

This package exposes two `NestedStack`s:
  * `IdentityStackPersistent` - System wide a8n. Used for users of the system (drivers, customers, restaurants, etc)
  * `InternalIdentityStackPersistent` - System wide a8n. Used for system operators/admins. Currently it's used to access ElasticSearch's Kibana


## IdentityStackPersistent

System wide a8n. Used for users of the system (drivers, customers, restaurants, etc)

* Cognito
  * Users - UserPool - to handle users of the system
    * userpool domain
    * web-app userpool client
    * simulator userpool client
    * native-app userpool client
    * Administartors user group
    * Admin user
  * IdentityPool - to handle identities
    * Authenticated role
    * Unauthenticated role

## `InternalIdentityStackPersistent` resources

System wide a8n. Used for system operators/admins. Currently it's used to access ElasticSearch's Kibana

* Cognito
  * Users - UserPool - to handle users of the system
    * userpool domain
    * Administartors user group
    * Admin user
  * IdentityPool - to handle identities
    * Authenticated role
    * Unauthenticated role

## Usage

```ts
import { IdentityStackPersistent, InternalIdentityStackPersistent } from '@prototype/cognito-auth'

const identityStack = new IdentityStackPersistent(this, 'IdentityStackPersistent', {
    administratorEmail,
    administratorName,
})

const internalIdentityStack = new InternalIdentityStackPersistent(this, 'InternalIdentityStackPersistent', {
    administratorEmail,
    administratorName,
})
```
