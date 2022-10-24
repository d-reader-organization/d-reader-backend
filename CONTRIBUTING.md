<h1 align="center">dReader contributing guide</h1>

> Conventions and steps to respect when contributing to the project

## Project structure

....

TODO

....

## Git

### Branching

- `master` is the production branch. CI/CD will reflect all changes on [api.dreader.io](api.dreader.io)

- ~~`staging` - [api.staging.dreader.io](api.staging.dreader.io)~~

- ~~`qa` - [api.qa.dreader.io](api.qa.dreader.io)~~

- `dev` - [api.dev.dreader.io](api.dev.dreader.io)

- `[chore | feat | fix | hotfix]/[task-name]` for active branches

e.g. `feat/candy-machine-integration` into `dev`, then `qa`, `staging`, and finally `master`

### Commits

Follow ['Conventional Commits'](https://www.conventionalcommits.org/en/v1.0.0/) guidelines

`feat: add candy-machine service`

`fix: wallet authorization nonce token generation`

`chore: bump dependencies`