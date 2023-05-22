#!/bin/sh

test -z "$AUDIT_BROADCAST_WEBHOOK" && exit 0

command -v curl || apk add curl

curl "$AUDIT_BROADCAST_WEBHOOK" -X POST -H "Content-Type: application/json" \
  -d "{ \"content\": \"[d-reader-backend] $*\" }"
