#!/bin/bash

## brew tap jenslauterbach/ddbt
## brew install ddbt

# make sure you created a `.env` file next to this and defined the following variables:
# PROFILE, REGION, NAMESPACE
source .env

SIMNAMESPACE=sim

tables=(external-example-webhook-orders external-example-polling-orders "$NAMESPACE-order" "$NAMESPACE-instant-delivery-provider-orders" "$NAMESPACE-instant-delivery-provider-locks" "$NAMESPACE-dispatcher-assignments" "$SIMNAMESPACE-event")

for table in "${tables[@]}"; do
    ddbt --no-input --profile $PROFILE --region $REGION $table
done
