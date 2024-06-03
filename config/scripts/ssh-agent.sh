#!/bin/sh

action=$1
env=$2
if [ -z "$action" ] || [ -z "$env" ]; then
  echo "Usage: $0 <load|unload> <env>"
  exit 1
fi
cd "$(dirname "$0")" || exit 1

case "$action" in
load)
  sops -d "../ssh-keys/$env.enc" | ssh-add -
  ;;
unload)
  ssh-add -d "../ssh-keys/$env.pub"
  ;;
*)
  echo "Usage: $0 <load|unload> <env>"
  exit 1
  ;;
esac
