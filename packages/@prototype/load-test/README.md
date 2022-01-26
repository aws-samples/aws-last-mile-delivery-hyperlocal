# `@prototype/load-test`

This packages uses **k6** to test the external API provided by the prototype.

## Usage

Install K6 in your local machine

```sh
$ brew install k6
```

provide the ENV variable required to run the scripts:

```sh
export API_PREFIX=XXXXXXXXXX.execute-api.ap-southeast-1.amazonaws.com/prod/
export K6_AUTH_TOKEN=ey.....
```
> the `K6_AUTH_TOKEN` is the cognito authentication token than can be retrieved from the network tab of your browser from the simulator website.

Once configured, just run one of the scripts inside the `/src` folder.

eg.

```
$ k6 run src/query.js
```

> you can provide the env variables also inline [see details](https://k6.io/docs/using-k6/environment-variables/)

## K6

More information about K6 can be found in the relative website: https://k6.io/docs/