#!/bin/bash

# make sure you created a `.env` file next to this and defined the following variables:
# PROFILE, REGION
source .env

## NOTE: this script is a bit buggy but does what it's supposed to do

MAX_ITEMS=20
CLUSTER_NAME=sim-simulator

function executeCommand() {
    printf "\n\tExecuting: $1"
    X=`eval ${1}`
}

# ## and everything else
while [ 1 ]
do

    LISTCMD="aws ecs list-tasks --cluster $CLUSTER_NAME --profile $PROFILE --region $REGION --max-items $MAX_ITEMS --desired-status RUNNING --output json"
    RESP=`eval ${LISTCMD}`
    CNT=$(echo "$RESP" | jq '.taskArns | length')
    EXECS_RESP=$(echo "$RESP" | jq -c -r '.taskArns[]')
    EXECS=(${EXECS_RESP//=/ })
    NEXT_TOKEN=$(echo $RESP | jq -c .'NextToken')

    if [ "$CNT" -eq 0 ]; then break; fi

    let CTR=CTR+1
    echo "ctr ${CTR}"

    for id in "${EXECS[@]}"; do
        STOPEXECSCMD="aws ecs stop-task --task $id --profile $PROFILE --region $REGION --cluster $CLUSTER_NAME"
        executeCommand "$STOPEXECSCMD" &
    done

done

#   for id in "${EXECS[@]}"; do
#       STOPEXECSCMD="aws ecs stop-task --task $id --profile $PROFILE --region $REGION --cluster $CLUSTER_NAME"
#       executeCommand "$STOPEXECSCMD" &
#   done

# done
