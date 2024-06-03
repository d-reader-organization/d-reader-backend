#!/bin/sh

env=$1
if [ -z "$env" ]; then
  echo "Usage: $0 <env> [mrsk args]"
  exit 1
fi
shift
scripts=$(cd -P -- "$(dirname -- "$(realpath -- "$0")")" && pwd -P)

"$scripts/ssh-agent.sh" load "$env" 2>&1 | grep -v "^Identity added"
sops -d --output ".env.$env" "config/env/$env.enc.env"

mrsk "$@" -d "$env"
status=$?

rm -f ".env.$env"
"$scripts/ssh-agent.sh" unload "$env" 2>&1 | grep -v "^Identity removed"

exit $status
