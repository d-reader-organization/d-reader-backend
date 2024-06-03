#!/bin/sh

cd "$(git rev-parse --show-toplevel)" || exit

grep -E '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' -rn config .github/workflows |
  sort |
  while read -r line; do
    file="$(echo "$line" | cut -f1 -d:)"
    ln="$(echo "$line" | cut -f2 -d:)"

    if ! git blame "$file" | grep -n '^0\{8\} ' | cut -f1 -d: | grep -q "$ln"; then
      echo "$line"
    fi
  done
