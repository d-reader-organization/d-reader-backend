#!/bin/sh

env=$1
if [ -z "$env" ]; then
  echo "Usage: $0 <env> [mrsk args]"
  exit 1
fi
shift
scripts=$(cd -P -- "$(dirname -- "$(realpath -- "$0")")" && pwd -P)

bin="mrsk"
if ! command -v "$bin"; then
  bin="docker run -it --rm -v '$PWD:/workdir' -v '$SSH_AUTH_SOCK:/ssh-agent' -v /var/run/docker.sock:/var/run/docker.sock -e 'SSH_AUTH_SOCK=/ssh-agent' ghcr.io/mrsked/mrsk:latest"
fi

"$scripts/ssh-agent.sh" load "$env" 2>&1 | grep -v "^Identity added"
sops exec-env "config/$env.enc.env" "$bin $* -d $env"
"$scripts/ssh-agent.sh" unload "$env" 2>&1 | grep -v "^Identity removed"
