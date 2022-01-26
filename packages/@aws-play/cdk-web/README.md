# `@aws-play/cdk-web`

This package provides constructs that will help you to deploy SPA webapps hosted in S3 and Cloudfront.

## WebsiteHosting construct

This construct creates an S3 bucket with website hosting enabled and a cloudfront distribution with the S3 bucket as an origin.

In case you want to use multiple origins in your distribution, you can parameterize that too.

### WebsiteHostingProps

* bucketName - the raw name of the S3 bucket to create. It will be made `namespaced` at creation.
* indexDocument - the name of the `websiteIndexDocument`. Default: `index.html`
* errorDocument - the name of the `websiteErrorDocument`. Default: `error.html`
* retainResources - whether set the `RemovalPolicy` to `RETAIN`
* additionalHostingBuckets - a list of settings to add additional buckets as origins to the CF distro
* errorConfigurations - custom error reponse property list

### Usage

```ts
const websiteHosting = new WebsiteHosting(this, 'WebsiteHosting', {
    bucketName: 'website',
    
    // host images from other bucket
    additionalHostingBuckets: [
        {
            hostingBucket: myImagesBucket,
            allowUpload: true,
            pathPattern: '/images/*',
        },
    ],

    // react routing helper
    errorConfigurations: [
        {
            errorCode: 404,
            responseCode: 200,
            responsePagePath: '/',
        },
    ],
})
```

## HostingDeployment construct

This construct deploys the website bundle into the S3 bucket (cdk `BucketDeployment`).

### HostingDeploymentProps

* websiteBundlePath - The file/folder on the local disk pointing to the website bundle
* hostingBucket - Reference to the hosting bucket
* destinationKeyPrefix - The destination key prefix in the S3 bucket. Default value is `'/'`


### Usage

```ts
// find the website bundle
const prototypeDir = findUp('prototype', { cwd: __dirname, type: 'directory' }) || '../../../../../'
const websiteBundlePath = path.join(prototypeDir, 'website', 'build')

const hostingDeployment = new HostingDeployment(this, 'WebsiteHostingDeployment', {
    websiteBundlePath,
    hostingBucket,
})
```

## AppVariables

With this construct, you can automate placing resource addresses into your website deployment containing in one variables file.

Usually, using e.g. `Cognito` for logging in and `API Gateway` to provide endpoints for your SPA webapp, you need to feed variables into your webapp to know how to call the endpoints and where to auth your users. The key benefit here is that these resource addresses only become available when they have been deployed. `AppVariables` construct automates the process of updating these variables in your webapp's S3 bucket.

You can access all these config settings in your web application via the `appVariables` global variable if you place a reference to this `.js` file in your `index.html`.

### AppVariablesProps

* appVars - key-value pairs representing config entries (e.g.: `USERPOOL_ID: 'zxczxczxc`)
* hostingBucket - Reference to the hosting bucket
* appVarDestinationKey - The destination key of the file being placed in the hosting bucket. Default value is `assets/appVariables.js`

### Usage

```ts
const appVars = {
    API_URL: restApi.url,
    REGION: this.region,
    USERPOOL_ID: backendUserPool.userPoolId,
    USERPOOL_CLIENT_ID: webAppApi.userPoolClient.userPoolClientId,
}

const appVariables = new AppVariables(this, 'WebsiteAppVars', {
    appVars,
    hostingBucket,
})
```

The above code will result in a file `s3://${hostingBucket}/assets/appVariables.js`:

```js
'use strict';

const appVariables = {
  "API_URL": "https://xxxxxxxxxx.execute-api.ap-southeast-1.amazonaws.com/prod",
  "REGION": "ap-southeast-1",
  "USERPOOL_ID": "ap-southeast-1_XXXXXXXXX",
  "USERPOOL_CLIENT_ID": "xxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```