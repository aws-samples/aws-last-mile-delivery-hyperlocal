# Prototype Config

The contents of this folder are used to configure deployments of the CDK stack
based on different account and environment settings.

## How to use config?
Config supports compiling a configuration based on multiple files with specific precedence that are enabled via environment variables. This allows creating AWS Account specific configuration based on the contextual account in environment and defining additional overrides based on environment flags. The account is automatically detected from CDK environment variables and mapped to relevant config file.

### File Load Order
```
default.EXT
default-{account}.EXT

{env}.EXT
{env}-{account}.EXT

local.EXT
local-{account}.EXT
local-{env}.EXT
local-{env}-{account}.EXT

(Finally, custom environment variables can override all files)
```

- EXT is any format supported by [node-config](https://github.com/lorenwest/node-config/wiki/Configuration-Files#file-load-order)
- `{account}` is AWS account based on `$CDK_DEFAULT_ACCOUNT`.
- `{env}` is any environment flag, from the `$CDK_ENV` and [CDK Runtime Context](https://docs.aws.amazon.com/cdk/latest/guide/context.html) `env` property. Supports list in comma-separated-value format.

The `default.EXT` file is designed to contain all configuration parameters from which other files may overwrite. Overwriting is done on a parameter by parameter basis, so subsequent files contain only the parameters unique for that override.

> `local*.EXT` files should **NOT** be committed to version control system.

## How to add a new account configuration?
Account specific configuration can be defined by the above file patterns (`default-{account}.EXT` and `{env}-{account}.EXT`, plus local overrides).

Start by copying an existing account config and replacing the filename `{account}` part with the new account id and then update the content as necessary based on account specifics.

There is no specific format that needs to be followed as this is up to the CDK implementation to infer and handle. It is useful however to adding `account` and `region` in an `env` object that can be mapped directly to your Stage/Stack constructs as well as other properties they require.
```
{
	"env": {
		"account": "11111111111",
		"region": "ap-southeast-1"
	},
	"administratorEmail": "hello@example.com",
	"enableAwesomeFeature": true,
	"externalArnExample": "arn:aws:lambda:ap-southeast-1:11111111111:function:awesome-feature"
}

```

## What is best way to deploy to individual developer account?
Often what should be committed to version control is the shared account & environment configuration rather than bespoke development setups. There is no restriction on committing individual account configs, but given the size of a team this could get polluted.

Given this, it is preferred to use local overrides for individual developer accounts that are not commit to version control.

Create a new `local-{account}.EXT` file for the dev account and don't commit to version control.

Additionally create `local-{env}-{account}.EXT` for environment flag overrides as well.

## What is the `test.json` config?
This is an `environment` based config with some handy defaults used for running tests with default values, such as account/region when can't be derived from environment.

## What is `custom-environment-variables.json` file?
This is a [special config](https://github.com/lorenwest/node-config/wiki/Environment-Variables#custom-environment-variables) that enables overriding specific properties based on defined environment variables. This can be useful for providing secrets and settings that should not be defined in static files and enables easy development overrides.

## How does config work?
Configuration is handled by an abstraction of [node-config](https://github.com/lorenwest/node-config)
implemented specifically for CDK purposes. The general semantics are the same as `node-config` but
with CDK / AWS environment specific mapping and handling.
