## v0.10.0 - Complete Authentication System Overhaul

## 🚀 Major Architecture Change: Dropped better-auth
**Breaking Change**: Replaced entire `better-auth` dependency with custom authentication system for improved reliability, performance, and maintainability. Backup your database and merge it with the adjusted structure. User passwords need to be reseted.

## 🔄 Real-Time Event Enhancements
**Multi-Platform Real-Time Updates**: Extended existing Socket.IO event system to API and MCP tools, ensuring consistent real-time updates across all interaction methods.

### 📡 Real-Time Events Extended to API & MCP
- **Card Operations**: `addCard`, `updateCard`, `deleteCard`, `moveCard` events
- **Area Operations**: `addArea`, `updateArea`, `deleteArea`, `updateAreas` events  
- **Board Operations**: `updateBoard`, `deletedBoard` events
- **Comment Operations**: `addComment` events
- **Multiplayer Collaboration**: Real-time updates for opened cards (title, content, attachments)

### 🔧 Authentication Core (Replaced better-auth)
- **Session Management**: Custom session creation, validation, and destruction
- **Performance**: No external auth server dependency
- **Endpoints Created**:
  - `/api/auth/sign-in` - User login with session creation
  - `/api/auth/sign-up` - User registration with auto-login
  - `/api/auth/logout` - Session termination
  - `/api/auth/get-session` - Session validation middleware

### 👤 User Management
- **Profile Updates**: `/api/auth/update-user` endpoint
- **Password Changes**: `/api/auth/update-password` endpoint
- **Admin Functions**: Complete admin user CRUD operations
  - `/api/auth/admin/create` - Admin user creation
  - `/api/auth/admin/list` - User listing
  - `/api/auth/admin/update` - User updates
  - `/api/auth/admin/delete` - User deletion

### 🔑 API Key Management
- **Generation**: `/api/auth/api-key/create` endpoint
- **Listing**: `/api/auth/api-key/list` endpoint  
- **Deletion**: `/api/auth/api-key/delete` endpoint
- **Security**: Proper ownership validation and cleanup

### 🔒 Password Reset System
- **Request Reset**: `/api/auth/request-password` endpoint
- **Complete Reset**: `/api/auth/reset-password` endpoint
- **Email Integration**: Proper translated email sending
- **Token Security**: 24-hour expiration, one-time use

### 🌍 Internationalization
- **New Translation Keys**: Added to all 7 languages (en, de, es, fr, it, nl, pl)
- **Error Messages**: Comprehensive error translations for all endpoints
- **Email Translations**: Server-side translation utility for emails

### 📝 Component Updates
**Removed all `better-auth` dependencies and updated to use custom endpoints:**
- `SettingsForm.vue` - Profile updates
- `PasswordForm.vue` - Password changes
- `ApiForm.vue` - API key creation
- `ApiList.vue` - API key listing
- `ApiItem.vue` - API key deletion
- `UserList.vue` - User management
- `NewUserForm.vue` - User creation
- `EditUserForm.vue` - User profile editing
- `EditUserPassword.vue` - User password updates
- `lost-password.vue` - Password reset request
- `reset-password/[token].vue` - Password reset completion

### 🔧 Technical Improvements
- **Session Utility**: Created `server/utils/auth.ts` with reusable functions
- **Translation Utility**: Created `server/utils/translations.ts` for server-side emails
- **Middleware Updates**: Updated auth middleware for new session validation
- **Error Handling**: Consistent error responses across all endpoints
- **Security**: Proper input validation and sanitization

## v0.9.2

## v0.9.2

- Fixed issue with public registration, env variable was not checked correctly
- Board and user images are now also stored as physical files instead of Base64 decoded

## v0.9.1

- Fix: Required some changes to the creation of api keys
- Picked a better matching icon for commentCount

## v0.9.0

- /api/data/card.ts: Returns additionally commentCount and attachmentCount
- /api/data/cards.ts: Returns additionally commentCount and attachmentCount
- Multiplayer updates for title, content and attachments on opened cards
- Added comment and attachment count below the title on cards
- Update commentCount when a new comment is created
- Update attachmentCount when a new attachment is uploaded
- Updated all dependencies


## v0.8.1

### Bug Fixes

- Fixed an error with images in comments on the email notification. It was missing the baseURL.
- Resolved issue where notification messages were output as a by comma seperated string

## v0.8.0

### 🚀 Major Architecture Changes

**🔧 Storage System Overhaul**
- **Migrated from base64 to file-based storage**: Images and attachments are now uploaded to the server and stored as files rather than base64-encoded data in the database
- **Performance improvements**: Significantly reduces database size and improves API response times
- **Backward compatibility**: Existing base64-encoded attachments continue to function normally
- **Migration recommendation**: Consider recreating cards with new attachments to optimize database performance

### ✨ Enhancements

**📁 Expanded Attachment Support**
- Added support for **image files (JPG, PNG)** and **ZIP archives** as card attachments
- Images can now be attached directly to cards (previously only available in rich text content)

**🔄 Improved User Experience**
- Added **back button** to card delete confirmation dialog for easier navigation
- Added **back button** to attachments upload interface for better user flow

### 🐛 Bug Fixes

**🎨 Layout Improvements**
- **Fixed layout shift** in card modal caused by asynchronous comment section loading
- Comments now load before modal rendering to prevent visual jumping

**📧 Email Notifications**
- **Fixed notification email formatting**: Properly joins notification messages array into readable text
- Resolved issue where notification messages were output as raw array

## v0.7.3

Quick-Hotfix: Disabling the signup functionality with flag `NUXT_PUBLIC_SIGNUP` caused some issues

## v0.7.2

### Improvements
- Introduced an enviroment variable `NUXT_PUBLIC_SIGNUP` to enable or disable the signup functionality

### Fixes
- Solved problems with the comment notifications when they contained an image
- API Endpoint returned an error when trying to create a notification with too long text, especially in the case of comments with screenshots, since it was defined as `TEXT` column instead of `LONGTEXT`
- Fetching invites when opening a board, instead of when opening the inviteModal. Removes an unnecessary layout shift.

### Docs

- Introduced new page disable-signup

## v0.7.1

- Fix: Changing a cards description after uploading an attachment caused duplicates
- Fix: Set modal window background to position fixed
- Fix: Dark background of "adding an attachment" option on the card modal window was overlapping with the modal box rounded corners

## v0.7.0

- Introduced non image attachments to cards. You can now add PDF, DOCX, PPTX, CSV etc. to a card.
- Long titles have been cut off on card modal window, fixed by switch from input "text" to an editable div
- Updated  dependencies (better-auth)

## v0.6.1

- Added Emoji-Support (@tiptap/extension-emoji)
- Completed the documentation for API
- Slightly adjusted the featurelist on docs landingpage
- Updated dependencies (nuxt, better-auth, @nuxtjs/i18n)

## v0.6.0

- Installed MCP-Toolkit
- Introduced a `NUXT_MCP` flag to disable the MCP Server entirely
- Added a `createArea` tool for the MCP Server, to create a new area on an existing board
- Added a `createBoard` tool for the MCP Server, to create a new board
- Added a `createCard` tool for the MCP Server, to create a new card in an existing area
- Added a `deleteArea` tool for the MCP Server, to delete an area
- Added a `deleteBoard` tool for the MCP Server, to delete a board
- Added a `deleteCard` tool for the MCP Server, to delete a card
- Added a `getArea` tool for the MCP Server, to fetch a specific area
- Added a `getBoard` tool for the MCP Server, to fetch a specific board
- Added a `getCard` tool for the MCP Server, to fetch a specific card
- Added a `listAreas` tool for the MCP Server, to expose all available areas on an existing board
- Added a `listBoards` tool for the MCP Server, to expose all available boards of the user
- Added a `listCards` tool for the MCP Server, to expose all available cards in an area
- Added a `listComments` tool for the MCP Server, to expose all available comments on a card
- Added a `moveAreas` tool for the MCP Server, to update the order of areas in a board
- Added a `moveCard` tool for the MCP Server, to move a card from one area to another
- Added a `orderCard` tool for the MCP Server, to update the order of cards in an area
- Added a `updateArea` tool for the MCP Server, to update an existing area
- Added a `updateBoard` tool for the MCP Server, to update an existing board
- Added a `updateCard` tool for the MCP Server, to update an existing card
- Added a `writeComment` tool for the MCP Server, to create a new comment on a card
- Added a MCP-Server page to the docs
- Improved comment notification, includes the content and name of the content creator
- Switched to a HTML from plain text for mails
- Fixed an issue with the dark background of a card modal window. Users have not been able to close the card by clicking on this backgrond.

## v0.5.7

- Adjusted query keys for docs to prevent issues when built static
- Fixed mobile issues for docs
- Optimized accessibility for docs
- Optimized SEO for docs

## v0.5.6

- Fixed a issue that prevented to save a board when no image was
provided

## v0.5.5

- Allows the upload or selection of an thumbnail for a board
- Added 6 board placeholder images to the public folder
- Add a screenshot to the landingpage
- Add a screenshot to the README.md file

## v0.5.4

- Created a first version of documentation with nuxt/content in docs folder
- Removed `pointer-events-auto` class from ModalWindow Component due to mobile problems
- Adjusted minimum screen size to `min-h-svh` instead of `min-h-screen` due to mobile problems
- Adjusted slate color in bright theme

## v0.5.3

- Added an delete button for cards
- Changed the color of the status checkbox to primary color
- Minimal updates to the color schemes
- Removed relict api route: api/upload/image.ts
- Added a new touchicon
- Introduced a CHANGELOG.md file
- Updated dependencies

## 0.5.2

- Fixed a small issue with the invite system after the API Access was introduced.

## 0.5.1

- We introduced a dark mode. If the device prefers a dark scheme we show it to the user. Otherwise they will still see the bright layout.

## 0.5.0

- You can now generate API keys with the same permissions as your user account. This enables you to build custom tools and automate workflows, making your experience with LocalBoards even more powerful and efficient.
