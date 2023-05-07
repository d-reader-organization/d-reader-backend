#!/bin/sh

env=$1
shift
if [ -z "$env" ]; then
  echo "Usage: $0 <env> [mrsk args]"
  exit 1
fi
scripts=$(cd -P -- "$(dirname -- "$(realpath -- "$0")")" && pwd -P)

"$scripts/ssh-agent.sh" load "$env" 2>&1 | grep -v "^Identity added"
sops exec-env "config/$env.enc.env" "mrsk $* -d $env"
"$scripts/ssh-agent.sh" unload "$env" 2>&1 | grep -v "^Identity removed"
