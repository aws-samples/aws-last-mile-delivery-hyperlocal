#!/bin/bash

AWS_ACCOUNT_ID=XXXXXXXXXXXX

SIMULATOR_NAMESPACE=sim
BUCKET=$SIMULATOR_NAMESPACE-simulator-website-$AWS_ACCOUNT_ID-ap-southeast-1
PROFILE=hyperlocalAdmin
REGION=ap-southeast-1

aws s3 cp s3://${BUCKET}/static/appVariables.js ../simulator/website/public/static/ --profile $PROFILE --region $REGION