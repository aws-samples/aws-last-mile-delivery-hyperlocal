# Deployment quick start

1. Make sure your environment is setup properly and `docker` is running

    * Make sure `docker` has enough resources (min. `16GB` mem), otherwise build will fail

1. Build the project

    ```bash
    cd PrototypeCode
    yarn install
    yarn build:all
    ```

1. Setup your own configuration for your infrastructure

    ```bash
    cd prototype/infra/config
    cp default.yml default-XXXXXXXXXXXX.yml # where XXXXXXXXXXXX is your AWS account ID (12-digit)
    ```

    Open the newly copied `default-XXXXXXXXXXXX.yml` file and customize the configuraiton.

    Make sure that you have updated the following configuration parameters (MUST SET min list):
      * env.account
      * env.region
      * env.originUserPassword
      * env.destinationUserPassword
      * administratorEmail
      * graphhopperSettings.osmPbfMapFileUrl

1. Check out [ECS docs on ENI trunking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-instance-eni.html) and prepare your account.

    ```bash
    # example (change region/profile values)
    aws ecs put-account-setting-default --name awsvpcTrunking --value enabled --region ap-southeast-1 --profile hyperlocalAdmin
    ```

1. Bootstrap your account

    ```bash
    cd prototype/infra
    yarn bootstrap
    ```

1. Run the deployment

    ```bash
    cd prototype/infra
    yarn dev:deploy:all
    ```

1. Check your email (set as `administratorEmail`) for your temporary password

1. Check the URL for the newly created CloudFront Distribution, load it in your
browser and login with your email/temp password
