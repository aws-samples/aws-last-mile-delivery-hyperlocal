#!/bin/bash

# set -e

PROFILE=hyperlocalAdmin
REGION=ap-southeast-1
ACCOUNT_ID=XXXXXXXXXXXX
REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
MAPFILE_LOCAL_PATH=~/.graphhopper/openstreetmap/indonesia-latest.osm.pbf
PRE_GENERATED_CACHE_PATH=~/.graphhopper/openstreetmap/indonesia-latest.osm-gh
IMAGE=graphhopper-indonesia
# suspend this until Graphhopper releases a version that has no dependency to log4j
# GRAPHHOPPER_VERSION_TAG=3.2
COPY=1

mkdir -p ./tmp && cd ./tmp

echo "Cloning graphhopper"
# suspend this until Graphhopper releases a version that has no dependency to log4j
# ((COPY)) && git clone --depth 2 -b $GRAPHHOPPER_VERSION_TAG https://github.com/graphhopper/graphhopper.git
((COPY)) && git clone --depth 2 https://github.com/graphhopper/graphhopper.git

echo "Copy mapfile && pre-generated cache"
((COPY)) && mkdir -p map
((COPY)) && cp $MAPFILE_LOCAL_PATH ./map/

((COPY)) && mkdir -p graph-cache
((COPY)) && cp $PRE_GENERATED_CACHE_PATH/* ./graph-cache/

echo "Adding Dockerfile and config file"
((COPY)) && cp ../Dockerfile ./
((COPY)) && cp ../config-indonesia.yml ./
((COPY)) && cp ../gh-script/graphhopper.sh ./graphhopper/

echo "Building docker image"
docker build -t $IMAGE .
docker tag $IMAGE:latest $REPO/$IMAGE:latest

# If the repository doesn't exist in ECR, create it.
echo "Checking if repo '$IMAGE' exists"
aws ecr describe-repositories --repository-names "$IMAGE" --profile $PROFILE --region $REGION > /dev/null 2>&1

if [ $? -ne 0 ]
then
    echo "Repo $IMAGE doesn't exist. Creating..."
    aws ecr create-repository --repository-name "$IMAGE" --image-scanning-configuration "scanOnPush=true" --profile $PROFILE --region $REGION > /dev/null
fi

echo "Authenticating with ECR"
aws ecr get-login-password --region $REGION --profile $PROFILE | docker login --username AWS --password-stdin $REPO

echo "Publishing docker image"
docker push $REPO/$IMAGE:latest

echo "Removing tmp folder and copied assets"
cd ../
((COPY)) && rm -rf ./tmp

echo "Done"