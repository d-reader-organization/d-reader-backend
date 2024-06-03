<h1 align="center">dReader contributing guide</h1>

> Conventions and steps to respect when contributing to the project

....

## Git

### Branching

- `main` is the production branch. CI/CD will reflect all changes on [api-main-mainnet.dreader.io](https://api-main-mainnet.dreader.io/api) and [api-main-devnet.dreader.io](https://api-main-devnet.dreader.io/api)

- `dev` is the development branch. CI/CD will reflect all changes on [api-dev-mainnet.dreader.io](https://api-dev-mainnet.dreader.io/api) and [api-dev-devnet.dreader.io](https://api-dev-devnet.dreader.io/api)

- `[chore | feat | fix | hotfix]/[task-name]` for active branches

e.g. `feat/candy-machine-integration` into `dev`, and then `dev` into `main`

### Commits

Follow ['Conventional Commits'](https://www.conventionalcommits.org/en/v1.0.0/) guidelines

`feat: add candy-machine service`

`fix: wallet authorization nonce token generation`

`chore: bump dependencies`