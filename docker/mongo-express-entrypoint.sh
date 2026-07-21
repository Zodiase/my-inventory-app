#!/bin/sh

set -eu

if [ -z "${ME_CONFIG_BASICAUTH_USERNAME:-}" ] || [ -z "${ME_CONFIG_BASICAUTH_PASSWORD:-}" ]; then
    echo 'Mongo Express browser username and password are required.' >&2
    exit 1
fi

exec /docker-entrypoint.sh mongo-express
