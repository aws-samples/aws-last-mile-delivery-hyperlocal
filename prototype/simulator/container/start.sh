#!/usr/bin/env sh

if [ -z "$CONTAINER_TYPE" ]; then
    echo "CONTAINER_TYPE variable is not set. You must set its value to 'driver', 'customer' or 'restaurant'"
    exit 1
fi

if [ -z "$PROC_NUM" ]; then
    PROC_NUM=1
fi

sed -i "s/__INSTANCES__/$PROC_NUM/" app.json
sed -i "s/__CONTAINER_TYPE__/$CONTAINER_TYPE/" app.json

cat app.json

pm2-runtime app.json