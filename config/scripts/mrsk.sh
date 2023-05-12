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
  docker pull ghcr.io/mrsked/mrsk:latest
  bin="docker run -it --rm -v '$PWD:/workdir' -v '$SSH_AUTH_SOCK:/ssh-agent' -v /var/run/docker.sock:/var/run/docker.sock -e 'SSH_AUTH_SOCK=/ssh-agent' ghcr.io/mrsked/mrsk:latest"
fi

quote() {
  _str=""
  for arg in "$@"; do
    if echo "$arg" | grep -q " "; then
      _str="$_str \"$arg\""
    else
      _str="$_str $arg"
    fi
  done
  echo "$_str" | sed -e 's/^ //'
}

"$scripts/ssh-agent.sh" load "$env" 2>&1 | grep -v "^Identity added"
sops -d --output ".env.$env" "config/$env.enc.env"
eval "$bin $(quote "$@") -d $env"
rm -f ".env.$env"
"$scripts/ssh-agent.sh" unload "$env" 2>&1 | grep -v "^Identity removed"
