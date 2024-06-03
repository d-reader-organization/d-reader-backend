#!/bin/sh

find "$(git rev-parse --show-toplevel)" -name '*.enc*' -exec sops updatekeys {} \;
