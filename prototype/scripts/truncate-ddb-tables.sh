#!/bin/bash

## brew tap jenslauterbach/ddbt
## brew install ddbt

PROFILE=hyperlocalAdmin
REGION=ap-southeast-1
NS=devproto
SIMNS=sim

tables=(external-example-webhook-orders external-example-polling-orders "$NS-order" "$NS-instant-delivery-provider-orders" "$NS-instant-delivery-provider-locks" "$NS-dispatcher-assignments" "$SIMNS-event")

for table in "${tables[@]}"; do
    ddbt --no-input --profile $PROFILE --region $REGION $table
done