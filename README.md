# LocalBoards

LocalBoards is a open-source self-hosted Trello clone (MIT License). Users can create boards, invite others, and manage Kanban cards. There are also admin features to administrate the users. No external services used. All data is saved in your own database. LocalBoards is currently available in (EN, DE, FR, ES, IT, NL & PL). If your language is not here feel free to open an issue.

## Login with admin default data

E-Mail: admin@domain.com
Password: admin123

## Self Hosted

To install clone this repository and install dependencies:

```bash
git clone https://github.com/florian-strasser/LocalBoards
cd LocalBoards
npm install
```

### Enviroment variables
Create a .env file (and a .env.local file if you need a local build beside your production build) with following settings and adjust with your own database and mail configuration. It's important that you set NUXT_BOARDS_URL to the same URL you define for BETTER_AUTH_URL:

```dotenv
# App Name
NUXT_APP_NAME=LocalBoards
NUXT_BOARDS_URL=http://localhost:3000
NUXT_LANGUAGE=en
NUXT_PUBLIC_PRIVACY_URL=https://www.yourdomain.com/privacy-policy/
NUXT_SIGNUP=true

# Better Auth
BETTER_AUTH_SECRET=xiMkisCU78j5uekgi60b0CHyuYwOqJxS
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

### Build the app:

```bash
npx nuxt build
```

Move the builded app from /.output to your favorite hosting solution, that is able to run a nodejs app.

### Run the app:

```bash
node ./server/index.mjs
```

## Contribute

Since i maintain this project alone without any monetary interest, i want to encourage anyone to help if you found an issue. Feel free to open PR's if you find any issues. There is no contribution guide at the moment.

### Run development local

```bash
npm run dev
```
Or with a custom .env.local file:
```bash
npx nuxt dev --dotenv .env.local
```

### Build local
npx nuxt build --dotenv .env.local
