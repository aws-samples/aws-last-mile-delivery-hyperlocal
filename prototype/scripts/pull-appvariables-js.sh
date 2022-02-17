#!/bin/bash

if [ -f "./.env" ]; then
    . ./.env
else
    PROFILE=hyperlocalAdmin
    NAMESPACE=sim
    REGION=ap-southeast-1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --profile $PROFILE --region $REGION --output json | jq .Account --raw-output)
BUCKET=$NAMESPACE-simulator-website-$ACCOUNT_ID-$REGION

aws s3 cp s3://${BUCKET}/static/appVariables.js ../simulator/website/public/static/ --profile $PROFILE --region $REGION