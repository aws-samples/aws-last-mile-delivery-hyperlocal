#!/bin/bash

# make sure you created a `.env` file next to this and defined the following variables:
# PROFILE, REGION, NAMESPACE
source .env

SDD_DOCKER_TAG= #TODO add it here
MAPFILE_URL=https://download.geofabrik.de/asia/indonesia-latest.osm.pbf

CLUSTER_NAME=$NAMESPACE-DispatcherCluster
SERVICE_NAME=$NAMESPACE-Dispatcher-SameDay-DirectPudo

# project root
cd ../../

# 1. build project
yarn build:delivery-dispatch

# 2. docker build
pushd prototype/dispatch/delivery-dispatch/build/sameday/directpudo
docker build -t delivery-dispatch-sameday-directpudo-docker -f Dockerfile --build-arg MAPFILE_URL=$MAPFILE_URL ./
docker tag delivery-dispatch-sameday-directpudo-docker:latest $SDD_DOCKER_TAG
docker push $SDD_DOCKER_TAG

RESP=$(aws ecs list-tasks --profile $PROFILE --region $REGION --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --output json)
EXECS_RESP=$(echo "$RESP" | jq -c -r '.taskArns[]')
CURRENT_RUNNING_TASK_IDS=(${EXECS_RESP//=/ })

for taskArn in "${CURRENT_RUNNING_TASK_IDS[@]}"; do
    aws ecs stop-task --task $taskArn --profile $PROFILE --region $REGION --cluster $CLUSTER_NAME
done

popd
