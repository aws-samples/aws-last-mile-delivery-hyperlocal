#!/bin/bash

MAX_ITEMS=100

if [ -z "$1" ]; then
    # POLICY_NAME=devproto_driver_policy
    # POLICY_NAME=devproto_restaurant_policy
    POLICY_NAME=devproto_customer_policy
    echo "No policy name supplied, opting for $POLICY_NAME"
else
    POLICY_NAME=$1
fi


PROFILE=hyperlocalAdmin
REGION=ap-southeast-1

function executeCommand() {
    printf "\n\tExecuting: $1"
    X=`eval ${1}`
}

## first iteration
LISTCMD="aws iot list-targets-for-policy --policy-name $POLICY_NAME --profile $PROFILE --region $REGION --max-items $MAX_ITEMS --output json"
RESP=`eval ${LISTCMD}`
TARGETS_RESP=$(echo "$RESP" | jq -c -r '.targets[]')
TARGETS=(${TARGETS_RESP//=/ })
NEXT_TOKEN=$(echo $RESP | jq -c .'NextToken')

for id in "${TARGETS[@]}"; do
    DETACHCMD="aws iot detach-policy --policy-name $POLICY_NAME --target $id --profile $PROFILE --region $REGION"
    executeCommand "$DETACHCMD"
done

## and everything else
while [ ! -z "$NEXT_TOKEN" ]; do

    LISTCMD="aws iot list-targets-for-policy --policy-name $POLICY_NAME --profile $PROFILE --region $REGION --max-items $MAX_ITEMS --starting-token $NEXT_TOKEN --output json"
    RESP=`eval ${LISTCMD}`
    TARGETS_RESP=$(echo "$RESP" | jq -c -r '.targets[]')
    TARGETS=(${TARGETS_RESP//=/ })
    NEXT_TOKEN=$(echo $RESP | jq -c .'NextToken')

    for id in "${TARGETS[@]}"; do
        DETACHCMD="aws iot detach-policy --policy-name $POLICY_NAME --target $id --profile $PROFILE --region $REGION"
        executeCommand "$DETACHCMD"
    done

done