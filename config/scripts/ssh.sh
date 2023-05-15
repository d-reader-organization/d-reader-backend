#!/bin/sh

env=$1
if [ -z "$env" ]; then
  echo "Usage: $0 <env>"
  exit 1
fi
scripts=$(cd -P -- "$(dirname -- "$(realpath -- "$0")")" && pwd -P)

"$scripts/ssh-agent.sh" load "$env" 2>&1 | grep -v "^Identity added"

ssh "${SSH_USER:-root}@$(yq ".servers.web.hosts[${HOST_INDEX:-0}]" "config/deploy.$env.yml")"
status=$?

"$scripts/ssh-agent.sh" unload "$env" 2>&1 | grep -v "^Identity removed"

exit $status
