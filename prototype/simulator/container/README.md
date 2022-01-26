# Simulator

This module generate simulated driver data.

## Installation

```
yarn install
```

## Deployment

To deploy the container in the cloud run the build script with the required paramters:

```sh
./build.sh [repository-name] [account-name]
```

Where the parameters are:

- `repository-name`: the name of the ECR repository on the AWS Account
- `account-name`: the name of the local profile with AWS access (note: by default will use `default` profile if not provided)

## Local Setup

In order to run the simulator locally, provide the following environment variables inside a `.env` file:

```sh
IDENTITY_POOL_ID=
USER_POOL_ID=
USER_POOL_CLIENT_ID=
REGION=
ACCESS_KEY_ID=
SECRET_ACCESS_KEY=
SESSION_TOKEN=
POLICY_NAME=
IOT_HOST=
IOT_RULE_NAME=
BASE_USERNAME=
```

- `IDENTITY_POOL_ID`: The identity pool id that has the authenticated role grants to perform IoT actions
- `USER_POOL_ID`: The id of the user pool where the users will reside
- `USER_POOL_CLIENT_ID`: client id of an a Cognito client app (that has no secret)
- `REGION`: The AWS Region
- `ACCESS_KEY_ID`: The Session Key Id of an assumed role with access to Cognito admin actions
- `SECRET_ACCESS_KEY`: The Secret Access Key of an assumed role with access to Cognito admin actions
- `SESSION_TOKEN`: The Session Token of the assumed role
- `IOT_POLICY_NAME`: The IoT Policy name to be attached to the Cogito Principal to allow the user to perform IoT actions (publish, subscribe, connect)
- `IOT_HOST`: The IoT Endpoint (can be retrieved by using `aws iot describe-endpoint`)
- `IOT_RULE_NAME`: The Rule name where to ingest the data into (uses IoT Basic Ingest)
- `BASE_USERNAME`: The first part of the username (the simulator will create a user like `[base-username]-[id]@amazon.com`])

### Generate Keys

In order for the simulator to confirm the Cognito user without requiring additional manual operation is necessary to provide an **Access Key Id**, **Secret Access Key** and **Session Token** that have the perfomissions to perform `cognito-idp:AdminConfirmSignUp` and `cognito-idp:AdminUpdateUserAttributes` actions.

The best way is to create a role that has a policy with these actions allowed and assume the role via **AWS CLI** thus pass the resulting secrets.
Eg. Assume that your role is called `arn:aws:iam::XXXXXXXXX:role/SimulatorCognitoRole`

Add the following policies to `SimulatorCognitoRole`:
```json
{
    "Effect": "Allow",
    "Action": [
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminConfirmSignUp"
    ],
    "Resource": "*"
},
{
    "Action": "s3:GetObject",
    "Resource": [
        "arn:aws:s3:::devproto-config-XXXXXXXXX-ap-southeast-1",
        "arn:aws:s3:::devproto-config-XXXXXXXXX-ap-southeast-1/*"
    ],
    "Effect": "Allow"
}
```

```sh
aws sts assume-role --role-arn rn:aws:iam::XXXXXXXXX:role/SimulatorCognitoRole --role-session-name simulator-session --profile [your-profile]
```
> Note: Replace `XXXXXXXXX` with your account ID.

This will return you a output like the following:

```json
{
    "AssumedRoleUser": {
        "AssumedRoleId": "XXXXXXXX:simulator-session",
        "Arn": "arn:aws:sts::XXXXXXX:assumed-role/SimulatorCognitoRole/simulator-session"
    },
    "Credentials": {
        "AccessKeyId": "ZZZZZZZ",
        "SecretAccessKey": "XXXXXX",
        "SessionToken": "YYYYYY",
        "Expiration": "2016-03-15T00:05:07Z"
    }
}
```

Now you can replace the `AccessKeyId`, `SecretAccessKey` and `SessionToken` with the one in the env file in order to get the right access.

## Start

To start the simulation:

```sh
npm start
```

## Imge Scanning

Use [trivy](https://aquasecurity.github.io/trivy/v0.19.2/) to scan for container image vulnerabilities.

### Installation

```sh
brew install aquasecurity/trivy/trivy
```

Other [installation methods](https://aquasecurity.github.io/trivy/v0.19.2/getting-started/installation/).

### Run

Use the image name in the docker file to scan for vulnerabilities:

```sh
$ trivy image node:12.22.4-alpine3.14
```

result:

```sh
$ trivy image node:12.22.4-alpine3.14
2021-08-10T11:08:42.490+0800    INFO    Detected OS: alpine
2021-08-10T11:08:42.490+0800    INFO    Detecting Alpine vulnerabilities...
2021-08-10T11:08:42.494+0800    INFO    Number of language-specific files: 0

node:12.22.4-alpine3.14 (alpine 3.14.1)
=======================================
Total: 0 (UNKNOWN: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0)
```