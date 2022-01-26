#!/usr/bin/env bash

image=$1
profileName=$2
region=$3

if [ "$image" == "" ]
then
    echo "Usage: <repo-name> <profile> <region>"
    echo "e.g.: ./build.sh simulator-simulator-repository hyperlocalAdmin [ap-southeast-1]"
    exit 1
fi

if [ "$profileName" == "" ]
then
    echo "profileName is now set to default"
    profileName='default'
fi

if [ "$region" == "" ]
then
    echo "region is now set to default (ap-southeast-1)"
    region="ap-southeast-1"
fi


# Get the account number associated with the current IAM credentials
account=$(aws sts get-caller-identity --query Account --output text --profile ${profileName})

if [ $? -ne 0 ]
then
    exit 255
fi

registry="${account}.dkr.ecr.${region}.amazonaws.com"
fullname="${registry}/${image}:latest"

# If the repository doesn't exist in ECR, create it.

aws ecr describe-repositories --repository-names "${image}" --profile ${profileName} > /dev/null 2>&1

if [ $? -ne 0 ]
then
    echo "repository ${image} doesn't exist. creating..."
    aws ecr create-repository --repository-name "${image}" --profile ${profileName} > /dev/null
fi

# Login to the registry
echo "logging into registry $registry"
aws ecr get-login-password --region ${region} --profile ${profileName} | docker login --username AWS --password-stdin ${registry}

# Build the docker image locally with the image name and then push it to ECR
# with the full name.

docker build --rm -t ${image} .
docker tag ${image} ${fullname}
docker push ${fullname}