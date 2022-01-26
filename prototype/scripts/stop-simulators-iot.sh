#!/bin/bash

PROFILE=hyperlocalAdmin
REGION=ap-southeast-1

IOT_TOPIC=broadcast

payload='{ "type": "STOP_CUSTOMER_SIMULATION", "payload": {} }'
base64Payload=`echo $payload | base64`

aws iot-data publish --topic $IOT_TOPIC --profile $PROFILE --region $REGION --payload $base64Payload