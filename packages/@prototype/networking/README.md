# `@prototype/networking`

VPC and Networking Setup for Lambda - Redis/OpenSearch interactions

This package exposes a `Construct`.

The following resources are being created:

* `vpc` - a new VPC with
	* `PUBLIC`, `PRIVATE` and `ISOLATED` subnets
	* 1 NAT Gateway
	* security groups for `DMZ`, `Lambdas`, `MemoryDB`, `OpenSearch`
	* ingress rules setup to provide communication between artifacts residing in each security group
	* ~~a `Bastion` instance to be able to `ssh tunnel` to the database from a developer's machine~~

	For further configuration, please see the source.

## Usage

```ts
import { VpcPersistent, Networking } from '@prototype/networking'

const vpcPersistent = new VpcPersistent(this, 'VpcPersistent', {
	vpcName: 'Vpc',
	vpcCidr: '10.0.0.0/16',
})

const vpcNetworking = new Networking(this, 'Networking', {
	vpc,
	ingressRules: {
		dmz: vpcNetworkConfig.dmzSecurityIngress.map(o => ({ peer: Peer.ipv4(o.cidr), port: Port.tcp(o.port) })),
	},
})
```
