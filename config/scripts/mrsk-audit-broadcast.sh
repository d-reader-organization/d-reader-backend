#!/bin/sh

command -v curl || apk add curl

curl -X POST "$AUDIT_BROADCAST_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "{ text: \"[d-reader] $*\" }"
