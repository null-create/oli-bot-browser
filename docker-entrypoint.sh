#!/bin/sh
set -e

export BACKEND_HOST="${BACKEND_HOST:-host.docker.internal}"
export BACKEND_PORT="${BACKEND_PORT:-9734}"

envsubst '${BACKEND_HOST} ${BACKEND_PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'