#!/bin/bash

set -e

parse_boolean() {
  # shell true/false values returned here
  if [ "$1" = "1" ] || [ "$1" = "true" ] || [ "$1" = "yes" ] || [ "$1" = "on" ]; then
    return 0
  else
    return 1
  fi
}



echo "Fetching user pass secret from secret manager..."
PASSWORD_SECRET_VALUE=$(aws secretsmanager get-secret-value --secret-id $PASSWORD_SECRET_ARN --query 'SecretString' --output text)
echo "User pass secret set as REDIS_PASSWORD env variable..."

export REDIS_PASSWORD=$PASSWORD_SECRET_VALUE

echo "Parsing env vars..."
if [ -n "$REDIS_PORT" ]; then
    set -- "$@" "--redis-port" "$REDIS_PORT"
fi

if [ -n "$REDIS_HOST" ]; then
    set -- "$@" "--redis-host" "$REDIS_HOST"
fi

if [ -n "$REDIS_SOCKET" ]; then
    set -- "$@" "--redis-socket" "$REDIS_SOCKET"
fi

if [ -n "$REDIS_TLS" ] && parse_boolean "$REDIS_TLS"; then
    set -- "$@" "--redis-tls"
fi

if [ -n "$REDIS_USERNAME" ]; then
    set -- "$@" "--redis-username" "$REDIS_USERNAME"
fi

if [ -n "$REDIS_PASSWORD" ]; then
    set -- "$@" "--redis-password" "$REDIS_PASSWORD"
fi

if [ -n "$REDIS_DB" ]; then
    set -- "$@" "--redis-db" "$REDIS_DB"
fi

if [ -n "$REDIS_OPTIONAL" ] && parse_boolean "$REDIS_OPTIONAL"; then
    set -- "$@" "--redis-optional"
fi

echo "Starting redis-commander"
redis-commander "$@"
