# Deployment quick start

1. Build the project:

```sh
cd PrototypeCode
yarn install
yarn build:all
```

2. Deploy ExternalProviderMock stack

```sh
cd prototype/infra
yarn dev:deploy:externalmock
```

3. Take the outputs of the API URLS and update `prototype/infra/config/default-XXXXXXXXXXXX.json` (where `XXX` is your AWS account ID):

```json
"externalProviderConfig": {
    "MockPollingProvider": {
        "apiKeySecretName": "ExternalMockPollingProviderApiKeySecret",
        "url": "https://XXXXXXXXXX.execute-api.ap-southeast-1.amazonaws.com/prod" <---
    },
    "MockWebhookProvider": {
        "apiKeySecretName": "ExternalMockWebhookProviderApiKeySecret",
        "url": "https://YYYYYYYYYY.execute-api.ap-southeast-1.amazonaws.com/prod" <---
    }
},
```

4. Check out [ECS docs on ENI trunking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-instance-eni.html) and prepare your account.

```sh
aws ecs put-account-setting-default --name awsvpcTrunking --value enabled --region <YOUR_REGION> --profile <YOUR_AWS_PROFILE>

# example
aws ecs put-account-setting-default --name awsvpcTrunking --value enabled --region ap-southeast-1 --profile hyperlocalAdmin
```

5. Before the full stack deployment, build and push `graphhopper` and `order-dispacher` docker images.
    In order to build these images, you need to download `indonesia-latest.osm.pbf` from `geofabrik.de` and
    also pre-generate the graphhopper cache. This can be achieved running graphhopper locally built from source,
    edit `config-example.yml` to point to the right `.osm.pbf` file:

    ```sh
    cd path/to/graphhopper
    # edit config-example.yml
    ./graphhopper.sh build
    ./graphhopper.sh web path/to/openstreetmap/indonesia-latest.osm.pbf
    ```

    For more information, check out the [graphhopper README](./development/graphhopper/README.md).

    1. Graphhopper image

        ```sh
        cd prototype/scripts/graphhopper
        # review the parameters at the top of the file
        ./build-and-upload.sh
        ```

    2. Order dispatcher image
        ```sh
        cd prototype/dispatch/order-dispatcher
        # review the parameters at the top of the file
        ./build-docker.sh
        ```

        NOTE: update `src/main/resources/application-docker.properties` after Step 6 and redeploy
        
        > !!! TODO: automate

6. Run the deployment
   
    ```sh
    cd prototype/infra
    yarn dev:deploy:all
    ```

7. After deployment, build simulator docker image and push
   
    ```sh
    cd prototype/simulator/container
    # review the parameters at the top of the sh file
    yarn build:docker
    ```