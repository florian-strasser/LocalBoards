# Disable Signup

To disable the public signup functionality we introduced an enviroment flag `NUXT_PUBLIC_SIGNUP`. Set it to `false` to disable the signup functionality and `true` to activate it. Disabling the signup is actually recommended since it will keep other people and bots away from signup for your instance of LokalBoards. I guess most organisations will use it internally or with customers only.

```env
NUXT_PUBLIC_SIGNUP=false
```
