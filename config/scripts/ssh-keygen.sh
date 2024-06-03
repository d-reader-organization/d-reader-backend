#!/bin/sh

env=$1
if [ -z "$env" ]; then
  echo "Usage: $0 <env>"
  exit 1
fi
cd "$(dirname "$0")" || exit 1

project=$(basename "$(git rev-parse --show-toplevel)")

ssh-keygen -t ed25519 -C "$project-$env" -N "" -f "../ssh-keys/$env"
mv "../ssh-keys/$env" "../ssh-keys/$env.enc"
sops -e -i "../ssh-keys/$env.enc"
