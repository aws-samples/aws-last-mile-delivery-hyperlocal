# Prototype Infra (CDK)

## Config

See [config](./config/README.md).

## Development
> CDK does not support Typescript aliases, so you much build all packages
> before they can be resolved in `/prototype/infra` or another CDK based solution.
> Run `yarn watch` to auto build all packages when changed in root package.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `yarn build`   compile typescript to js
 * `yarn watch`   watch for changes and compile
 * `yarn test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
