# Migration

## Database migration

On v0.10.0 we removed the better-auth integration and it is necessary to migrate to the new database structure and reset user passwords.

It is recommend to export the data of your content tables (areas, attachments, boards, cards, comments, invitations & notifications). Then you should take a seperate export of the data of your user tables (account, apikey & user).

After that you can delete the tables of your database. On the next startup of LocalBoards it will create the new database structure.

Now you need to import the data. The content tables can be imported without any changes. At the user tables we removed some columns, you should remove those from your export before importing them again.

account: `accessToken`, `refreshToken`, `idToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`
user: `username`

```env
NUXT_PUBLIC_SIGNUP=false
```
