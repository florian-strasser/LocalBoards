# LocalBoards

LocalBoards is an open-source (MIT License), self-hosted Kanban board system. It allows users to create boards, invite collaborators, and manage Kanban cards. It also includes admin features for user management. All data is stored in your own database, with no reliance on external services.

We support real-time multiplayer updates. When you edit a card, area, or rename it, the changes are instantly reflected for all users viewing the board. Comments on cards are also updated in real-time across all browsers. This is powered by an internal Socket.IO integration.

LocalBoards is currently available in the following languages: English (EN), German (DE), French (FR), Spanish (ES), Italian (IT), Dutch (NL), and Polish (PL).

## Install

To install LocalBoards, follow these steps:

### Clone the Repository

```bash
git clone https://github.com/florian-strasser/LocalBoards
cd LocalBoards
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables
Create a `.env` file (and optionally a `.env.local` file for local development) with the following settings. Adjust the values to match your database and email configuration. Ensure that `NUXT_BOARDS_URL` and `BETTER_AUTH_URL` are set to the same URL.

```dotenv
# App Name
NUXT_APP_NAME=LocalBoards
NUXT_BOARDS_URL=http://localhost:3000
NUXT_LANGUAGE=en
NUXT_PUBLIC_PRIVACY_URL=https://www.yourdomain.com/privacy-policy/

# Better Auth
BETTER_AUTH_SECRET=YwOqJxSCU78j5uekgi60b0CHyuxiMkis
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TELEMETRY=0

# DB
NUXT_MYSQL_HOST=localhost
NUXT_MYSQL_USER=root
NUXT_MYSQL_PASSWORD=root1234
NUXT_MYSQL_DATABASE=root

# Email Configuration
NUXT_EMAIL_HOST=mail.yourserver.de
NUXT_EMAIL_PORT=465
NUXT_EMAIL_SECURE=true
NUXT_EMAIL_USER=contact@yourdomain.com
NUXT_EMAIL_PASS=password1234
```

### Build the Application

```bash
npx nuxt build
```

Move the builded app from /.output to your favorite hosting solution, that is able to run a nodejs app.

### Run the Application

```bash
node ./server/index.mjs
```

## Contribute

LocalBoards is maintained as a solo project without any monetary incentives. Contributions are highly encouraged! If you encounter any issues or have suggestions for improvements, feel free to open a pull request. There is currently no formal contribution guide, but your help is always welcome.

### Running Locally for Development

To run the application locally for development:

```bash
npm run dev
```

Or, if you have a custom `.env.local` file:
```bash
npx nuxt dev --dotenv .env.local
```

### Building Locally

To build the application locally:

```bash
npx nuxt build --dotenv .env.local
```
