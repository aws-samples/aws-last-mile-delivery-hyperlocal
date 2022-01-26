#!/bin/bash

# set -e

PROFILE=hyperlocalAdmin
REGION=ap-southeast-1
ACCOUNT_ID=XXXXXXXXXXXX
REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
MAPFILE_LOCAL_PATH=~/.graphhopper/openstreetmap/indonesia-latest.osm.pbf
PRE_GENERATED_CACHE_PATH=~/.graphhopper/graphhopper/indonesia
AWSCLI=awscli-exe-linux-aarch64.zip
AWSCLI_URL=https://awscli.amazonaws.com
IMAGE=order-dispatcher
COPY=1
BUILD_JAVA=1
PUSH_TO_ECR=1

((BUILD_JAVA)) && ./mvnw package

mkdir -p ./tmp && cd ./tmp

echo "Copy mapfile && pre-generated cache"
((COPY)) && mkdir -p map
((COPY)) && cp $MAPFILE_LOCAL_PATH ./map/

((COPY)) && mkdir -p graph-cache
((COPY)) && cp $PRE_GENERATED_CACHE_PATH/* ./graph-cache/

echo "Copy Dockerfile and config files"
((COPY)) && cp ../src/main/docker/Dockerfile.jvm ./Dockerfile
((COPY)) && cp ../src/main/docker/start-app.sh ./start-app.sh
((COPY)) && cp ../src/main/resources/application-docker.properties ./application.properties
((COPY)) && cp ../src/main/resources/dispatchSolverConfig*.xml ./

echo "Fetch AWS CLI"
((COPY)) && wget $AWSCLI_URL/$AWSCLI -o awscliv2.zip

echo "Copy uberjar"
((COPY)) && cp ../target/dispatcher-runner.jar ./

# If the repository doesn't exist in ECR, create it.
echo "Checking if repo '$IMAGE' exists"
((PUSH_TO_ECR)) && aws ecr describe-repositories --repository-names "$IMAGE" --profile $PROFILE --region $REGION > /dev/null 2>&1
if [ $? -ne 0 ]
then
    ((PUSH_TO_ECR)) && echo "Repo $IMAGE doesn't exist. Creating..."
    ((PUSH_TO_ECR)) && aws ecr create-repository --repository-name "$IMAGE" --image-scanning-configuration "scanOnPush=true" --profile $PROFILE --region $REGION > /dev/null
else
    ((PUSH_TO_ECR)) && echo "Repo $IMAGE exist."
fi

echo "Authenticating with ECR"
((PUSH_TO_ECR)) && aws ecr get-login-password --region $REGION --profile $PROFILE | docker login --username AWS --password-stdin $REPO

echo "Building docker image"
# docker build -t $IMAGE .
docker buildx build --platform linux/arm64 -t $REPO/$IMAGE:latest --push .
# docker tag $IMAGE:latest $REPO/$IMAGE:latest

# echo "Publishing docker image"
# ((PUSH_TO_ECR)) && docker push $REPO/$IMAGE:latest

echo "Removing tmp folder and copied assets"
cd ../
((COPY)) && rm -rf ./tmp

echo "Done"