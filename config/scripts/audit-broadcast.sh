#!/bin/sh

curl -X POST "$AUDIT_BROADCAST_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "{ text: \"*[$AUDIT_BROADCAST_APP]* $1\" }"
