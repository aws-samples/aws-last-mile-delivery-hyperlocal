#!/bin/bash

# make sure you created a `.env` file next to this and defined the following variables:
# PROFILE, REGION
source .env
NAMESPACE_SIM=sim

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile $PROFILE)
BUCKET=$NAMESPACE_SIM-simulator-website-$ACCOUNT_ID-$REGION

aws s3 cp s3://${BUCKET}/static/appVariables.js ../simulator/website/public/static/ --profile $PROFILE --region $REGION
