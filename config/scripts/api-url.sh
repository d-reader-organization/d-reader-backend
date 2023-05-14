#!/bin/sh

git_branch=$1
solana_cluster=$2
if [ -z "$git_branch" ] || [ -z "$solana_cluster" ]; then
  echo "Usage: $0 <git_branch> <solana_cluster>"
  exit 1
fi

echo "https://api.$git_branch.$solana_cluster.dreader.io" |
  sed 's/mainnet.//g' |
  sed 's/main.//g'
