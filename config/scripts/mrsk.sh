#!/bin/sh

env=$1
if [ -z "$env" ]; then
  echo "Usage: $0 <env> [mrsk args]"
  exit 1
fi
shift
scripts=$(cd -P -- "$(dirname -- "$(realpath -- "$0")")" && pwd -P)

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
sops exec-env "config/$env.enc.env" "mrsk $(quote "$@") -d $env"
"$scripts/ssh-agent.sh" unload "$env" 2>&1 | grep -v "^Identity removed"
