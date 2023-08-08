<h1 align="center">d-reader-backend</h1>

> NestJS backend for dReader dapp on Solana

<p>
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.0-blue.svg?cacheSeconds=2592000" />
</p>


## ⚠️ Prerequisites

> **Note** generate a new Helius **API key** via [Helius Dashboard](https://dev.helius.xyz/dashboard/app)

To test webhooks we recommend creating a reverse proxy to your local machine on which your localhost websever is running. We suggest using **ngrok**, which you can set up by following these [instructions](https://ngrok.com/docs/getting-started)

> **Note** ask DevOps engineer to generate new IAM user credentials for you


## ⚙️ Setup

> **Warning** make sure your node version matches the one specified in `.nvmrc`

Install dependencies and copy the `.env.example` content into `.env`:

```bash
yarn add & cp .env.example .env
```

Next run the command for generating env variables and replace placeholder values from `.env` as per instructions in the terminal. Fill in any remaining variables by following notes from the [.env section](#🌱-env):

```bash
yarn generate-environment
```

Then run migrations and seed the database:

```bash
yarn migrate:dev
```

```bash
yarn seed
```

Once steps above completed, run the following command to start the project in watch mode:

```bash
yarn start:dev
```

Open [http://localhost:3005](http://localhost:3005) with your browser to see the result. API documentation is available on the [/api](http://localhost:3005/api) route

## 🫡 Commands
For airdropping Sol to a specified wallet use the following command
```bash
yarn airdrop-sol
```

To authorize your treasury wallet (sign a message and generate a JWT token):
```bash
yarn authorize-wallet
```

## 🌱 .env
- **`JWT_ACCESS_SECRET`** and **`JWT_REFRESH_SECRET`** are randomly generated 42 char strings
- **`SOLANA_CLUSTER`** can be either `mainnet-beta`, `testnet` or `devnet`. Rule of thumb is to use `devnet` on localhost development, and `mainnet-beta` for production applications
- **`AWS_ACCESS_KEY_ID`** and **`AWS_SECRET_ACCESS_KEY`** are necessary for app to work as intended since app relies on AWS S3 for file storage. These credentials can be obtained upon IAM user creation (contact sysadmin to create IAM user for you)
- **`AWS_BUCKET_NAME`** should be delivered by sysadmin alongside AWS credentials
- **`TREASURY_PRIVATE_KEY`** is the AES encrypted private key of a wallet used as a Treasury. All royalties will be collected there and all our payments will be done with it.
- **`TREASURY_SECRET`** is the secret key used for AES encription/decription of the Treasury wallet's private key, preferably 64 byte long
- **`MAIL_SERVICE`** and other mail related variables are unnecessary unless working on email-related features. Make sure to [download NodemailerApp](https://nodemailer.com/app) for local development. For production setup follow the [nodemailer-gmail-smtp guide](https://blog.iamstarcode.com/how-to-send-emails-using-nestjs-nodemailer-smtp-gmail-and-oauth2)
- **`HELIUS_API_KEY`** can be obtained via [Helius Dashboard](https://dev.helius.xyz/dashboard/app)
- **`AUCTION_HOUSE_ADDRESS`** address of the auction house program over which our treasury wallet has the update authority
- **`DARKBLOCK_API_KEY`** can be obtained via [Darkblock Docs](https://darkblock.redoc.ly/apikey)

## 🤝 Contributing

When contributing please follow the guidelines specified in the [CONTRIBUTING](./CONTRIBUTING.md) document