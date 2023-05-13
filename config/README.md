# Deployment Guide

...

## Environment access setup

Required programs:
- [`sops`](https://github.com/mozilla/sops/releases/latest) - sops is simple and flexible tool for managing secrets in git repositories
- [`age`](https://github.com/FiloSottile/age#installation) - age is a simple, modern and secure file encryption tool, think of this like ssh keys but for encrypting files

Create age key:
- Linux:
  ```
  mkdir -p ~/.config/sops/age
  age-keygen -o ~/.config/sops/age/keys.txt
  ```
- MacOS:
  ```
  mkdir -p ~/Library/Application Support/sops/age
  age-keygen -o ~/Library/Application Support/sops/age/keys.txt
  ```
- Windows:
  ```
  md %AppData%\sops\age
  age-keygen -o %AppData%\sops\age\keys.txt
  ```

Send your public key (it's one with age prefix) to administrator and wait for
them to add you in `.sops.yaml`. After that change gets in repository, do git
pull and then you will be able to edit environment variables. See how in
[next](#how-to-edit-environment-variable) section.

## How to edit environment variable

If you don't have environment access up and running, take a look at
[this](#environment-access-setup) section.

> **Warning** Environment variable that contain special characters like `#` or
> `$` need to be wrapped in single quotes to prevent shell expansion

Edit encrypted .env file (it will be saved when you exit vscode tab):
```
EDITOR="code --wait" sops config/dev-devnet.enc.env
```

Edit `env:` in `config/deploy.yml` if secrets were removed or new ones were
added.

## How to deploy from local machine

...

## How to add/remove server

...