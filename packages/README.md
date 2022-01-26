# Prototype Packages
Common packages that can be used throughout the `/proto` code. Packages are **not** published and only available to this repository.

> Code is not available outside of engagement account

> CDK does not support Typescript aliases, so you much build all packages
> before they can be resolved in `/prototype/infra` or another CDK based solution.
> Run `yarn watch` to auto build all packages when changed.

## Create new package
Uses [hygen](https://www.hygen.io/) based template to generate packages.
> `yarn create-package`

## Package Dependencies
### Add root workspace dependency
>	`yarn add -W @aws-cdk/aws-s3`
>	`yarn add -dW @aws-cdk/aws-s3` (devDependency)
>	`yarn add -PW @aws-cdk/aws-s3` (peerDependency)
### Add relative workspace dependency (package specific dependency)
> `yarn workspace {workspace} add {...package}`
> `yarn workspace @aws-play/cdk-assets add foo`
> `yarn workspace @aws-play/cdk-assets add -D foo bar baz` (devDependency)
Peer dependencies adding with the follow, notice `-P` is at end, seems not to work otherwise
> `yarn workspace @aws-play/cdk-assets add @aws-cdk/core -P` (peerDependency)
Also supported format
> `yarn lerna add @aws-play/cdk-lerna-artifact-pipeline --scope=pipeline`
