#!/bin/bash

# make sure you created a `.env` file next to this and defined the following variables:
# PROFILE, REGION
source .env

IOT_TOPIC=broadcast

payload='{ "type": "STOP_DESTINATION_SIMULATION", "payload": {} }'
base64Payload=`echo $payload | base64`

aws iot-data publish --topic $IOT_TOPIC --profile $PROFILE --region $REGION --payload $base64Payload
