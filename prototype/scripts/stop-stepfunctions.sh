#!/bin/bash

# make sure you created a `.env` file next to this and defined the following variables:
# PROFILE, REGION
source .env

MAX_ITEMS=20

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile $PROFILE)
STATEMACHINE_ARN=arn:aws:states:ap-southeast-1:$ACCOUNT_ID:stateMachine:devproto-OrderManagerStepFunction

function executeCommand() {
    printf "\n\tExecuting: $1"
    X=`eval ${1}`
}

## first iteration
LISTCMD="aws stepfunctions list-executions --state-machine-arn ${STATEMACHINE_ARN} --status-filter RUNNING --profile $PROFILE --region $REGION --max-items $MAX_ITEMS --output json"
RESP=`eval ${LISTCMD}`
EXECS_RESP=$(echo "$RESP" | jq -c -r '.executions[].executionArn')
EXECS=(${EXECS_RESP//=/ })
NEXT_TOKEN=$(echo $RESP | jq -c .'NextToken')

for id in "${EXECS[@]}"; do
    STOPEXECSCMD="aws stepfunctions stop-execution --execution-arn $id --profile $PROFILE --region $REGION"
    executeCommand "$STOPEXECSCMD" &
done

CTR=0

## and everything else
while [ ! -z "$NEXT_TOKEN" ]; do

    LISTCMD="aws stepfunctions list-executions --state-machine-arn ${STATEMACHINE_ARN} --status-filter RUNNING --profile $PROFILE --region $REGION --max-items $MAX_ITEMS --output json"
    RESP=`eval ${LISTCMD}`
    EXECS_RESP=$(echo "$RESP" | jq -c -r '.executions[].executionArn')
    EXECS=(${EXECS_RESP//=/ })
    NEXT_TOKEN=$(echo $RESP | jq -c .'NextToken')

    let CTR=CTR+1
    echo "ctr ${CTR}"

    for id in "${EXECS[@]}"; do
        STOPEXECSCMD="aws stepfunctions stop-execution --execution-arn $id --profile $PROFILE --region $REGION"
        executeCommand "$STOPEXECSCMD" &
    done

done
