## v0.15.0

### New Features
- Open images in comments or card description on click in the new `ImageWindow.vue` component
- Created a `Dockerfile` file
- Created a `.dockerignore` file
- Created a `docker-entrypoint.sh`

### Improvements
- Changed the `NotificationBell` unread indicator dot from `secondary` to `primary`
- Headlines no longer use the accent color (`text-primary`); they now render in a neutral near-black/white (`text-dark dark:text-white`). The accent `text-secondary` color is now used exclusively for hover states (required-field markers, error text, editor active-state, and inline links switched to `text-primary`)
- Replaced the default green color scheme with a neutral, Apple-style palette (blue accent, true-gray surfaces, light-gray `slate`) for both light and dark mode, with WCAG-checked contrast. Defaults updated in `nuxt.config.ts`, `app/assets/css/main.css`, and the `adjust-colors` docs; colors remain overridable via the `NUXT_PUBLIC_COLOR_*` environment variables
- Card descriptions now show a read-only view with an "edit description" button for write-access users instead of always showing the editor; the editor only opens immediately for a freshly created card opened for the first time (new `editDescription` translation added for all languages)
- Eliminated the layout shift when opening a card: `/api/data/cards` now prefetches each card's comments and attachment metadata, and `CardModal` renders instantly from the already-loaded board data instead of fetching on open
- Added a `/api/data/attachment` endpoint to fetch a single attachment's file payload on download, keeping the board response lean
- Removed the remaining modal shift by dropping the `await useFetch("/api/auth/get-session")` from `CommentSection` and `NewCommentForm` (which made them render a tick late); the current user id is now passed down from the board

### Bug Fixes
- Fixed duplicated cards/areas/comments from real-time updates: `Connection` and `CommentConnection` registered their socket listeners inside the `connect` handler, so every reconnect (and every card-modal open) stacked another set that was never removed. Listeners are now registered once and cleaned up on unmount
- Added an idempotency guard in the board's `card-created` handler so a card received more than once is updated in place instead of inserted again
- Code blocks in `CardEditor` now wrap long lines instead of overflowing the modal
- Code blocks (and inline code) are now visually highlighted with dedicated colors in both light and dark mode

### Improvements
- `Dockerfile` now pins its build stage to `$BUILDPLATFORM` so the build toolchain (esbuild/Vite) runs natively when cross-building, instead of under QEMU emulation (which crashed with random segfaults); only the final runtime image targets the requested platform

### Documentation
- Added a "Run with Docker" section to the README covering the Docker Hub image (`localboards/localboards`), a `docker run` example, and a Docker Compose setup that includes MySQL
- Updated the README Docker section to build images with `docker buildx --platform`, fixing the `Exec format error` that occurs when an `arm64` image (e.g. built on Apple Silicon) is deployed to an `amd64` server

### Dependencies
- Upgraded: nuxt, @tiptap/extension-emoji, @tiptap/extension-file-handler, @tiptap/extension-image, @tiptap/pm, @tiptap/starter-kit, @tiptap/vue-3, mysql2, nodemailer
- Droped: sass-embedded
- Upgraded docs: nuxt, @nuxtjs/seo

## v0.14.0

### New Features
- Added customizable colors via environment variables — see [color customization documentation](https://localboards.de/docs/adjust-colors)

### Dependencies
- Upgraded: mysql2, nodemailer

## v0.13.2

### Dependencies
- Docs dependencies upgraded: nuxt, @nuxt/content, better-sqlite3

## v0.13.1

### Bug Fixes
- Set scheduldedTask back to once an hour at minute "0". Was set to "12" in last version for testing reasons.

### Dependencies
- Upgraded: nuxt, @nuxtjs/i18n, @nuxtjs/mcp-toolkit, @tiptap/extension-emoji, @tiptap/extension-file-handler, @tiptap/extension-image, @tiptap/pm, @tiptap/starter-kit, @tiptap/vue-3

## v0.13.0

### New Features
- Added `card` URL parameter on board pages to directly open a specific card when the page loads
- Added direct links to boards and cards from notifications in `NotificationBell`

### Improvements
- Enhanced new card notifications to include the creator's username and the board name
- Increased spacing between individual notifications in notification emails

### Dependencies
- Upgraded: nuxt, @tiptap/extension-emoji, @tiptap/extension-file-handler, @tiptap/extension-image, @tiptap/pm @tiptap/starter-kit, @tiptap/vue-3

## v0.12.2 - Security Hotfix

### Security Fixes
- Fixed new ReDoS vulnerability in comment checklist validation by using a non-ambiguous regex pattern that prevents catastrophic backtracking (https://github.com/florian-strasser/LocalBoards/security/code-scanning/4)

## v0.12.1 - Security Hotfix

### Security Fixes
- Fixed ReDoS vulnerability in comment checklist validation by replacing ambiguous nested regex quantifiers with a safer pattern that prevents catastrophic backtracking (https://github.com/florian-strasser/LocalBoards/security/code-scanning/2, https://github.com/florian-strasser/LocalBoards/security/code-scanning/3)

## v0.12.0

### New Features
- Added support for toggling checklist item states in comments — users can now check/uncheck task items, with the API validating that only the checked state (`data-checked` and `checked` attributes) has changed

### Improvements
- Disabled scroll on body when `ModalWindow` is activated
- Added a hover state for links within card description or comments
- Removed footer with copyright information, since it steals space especially on the board pages

### Bug Fixes
- `/api/auth/api-key/create`: Returns now correctly the generated `key`

### Dependencies
- Upgraded: @nuxtjs/mcp-toolkit, tailwindcss, @tailwindcss/vite, @tiptap/extension-emoji, @tiptap/extension-file-handler, @tiptap/extension-image, @tiptap/pm, @tiptap/starter-kit, @tiptap/vue-3

### Docs
- Added PUT, PATCH and DELETE method documentation for comment API endpoint in `docs/content/api/comment.md`

## v0.11.3

### New Features
- Added inline confirmation dialog for comment deletion in `CommentSection.vue` — clicking the trash icon now shows "Are you sure?" with Delete/Cancel buttons, preventing accidental deletions
- Added inline comment editing in `CommentSection.vue` — comment creators can click the pen icon to edit using the `CardEditor` component, with Save/Cancel buttons
- Added PUT endpoint in `server/api/data/comment.ts` for updating comments, restricted to comment creators only
- Added real-time comment update synchronization via `CommentConnection` component and socket.io (`commentUpdated`/`updateComment` events)

### Improvements
- Changed all error messages in `server/api/auth/sign-in.ts` to return snake_case error codes (e.g., `method_not_allowed`, `invalid_credentials`) instead of descriptive messages, improving consistency and i18n support
- Added translations for all sign-in error codes (`error_method_not_allowed`, `error_required_fields_missing`, `error_invalid_credentials`, `error_invalid_email_or_password`, `error_authentication_failed`, `error_internal_server_error`) to all 7 locale files (en, de, es, fr, it, nl, pl)

### Bug Fixes
- Fixed duplicate comment entries in `CommentSection.vue` by adding existence check in `handleCommentCreated` before unshifting new comments to the array

### Dependencies
- Upgraded: nuxt, nodemailer, @tiptap/vue-3, @tiptap/starter-kit, @tiptap/pm, @tiptap/extension-image, @tiptap/extension-file-handler, @tiptap/extension-emoji

## v0.11.2

### Security Fixes
- **XSS Protection**: Strengthened URL scheme validation for user profile images in `server/api/auth/update-user.ts` to block `javascript:`, `vbscript:`, and non-image `data:` URIs (e.g., `data:text/html`). Only `http:`, `https:`, `data:image/*`, and relative paths are now permitted. Addresses Dependabot security advisory regarding executable URL schemes.

## v0.11.1

### Hotfix
- Fixed session creation failure for installations with numeric user IDs by removing strict UUID validation in `server/utils/auth.ts` createSession function

## v0.11.0

This release is all around security. I spent alot time to make every single API Endpoint more secure.

### New Features
- Added comment deletion capability in `server/api/data/comment.ts` with DELETE endpoint for comment creators
- Added delete button in `CommentSection.vue` with i18n translation key "deleteMessage" (added to all 7 language files)
- Added `handleCommentDeleted` in `CardModal.vue` to update comment count on deletion
- Real-time sync: comment deletion and count updates broadcast via socket events

### Authentication & Authorization (Applied to all data endpoints)
- Added early authentication checks blocking unauthenticated access to: `area.ts`, `areas.ts`, `board.ts`, `boards.ts`, `card.ts`, `cards.ts`, `cardMove.ts`, `cardOrder.ts`, `comment.ts`, `invite.ts`, `notifications.ts`
- Added userId null checks for defense in depth in all data endpoints before SQL queries
- Removed redundant inner authentication checks throughout all endpoints

### IDOR (Insecure Direct Object Reference) Fixes
- Fixed IDOR in `api/data/area` POST by adding board verification to area SELECT queries
- Hardened DELETE authorization in `api/data/area` to only allow board owners and edit-invited users
- Fixed IDOR in `api/data/board` GET and DELETE by removing query userId parameter and using authenticated userId
- Fixed IDOR in `api/data/boards` GET by using authenticated userId instead of client-provided userId from body
- Fixed IDOR in `api/data/card` POST by removing user parameter from body and using authenticated userId for notifications
- Fixed IDOR in `api/data/cardMove` by implementing access checks for both source AND destination boards
- Fixed IDOR in `api/data/comment` POST by removing user parameter from body and using authenticated userId
- Fixed IDOR in `api/data/invite` GET by removing client-provided userId from query and using authenticated userId
- Fixed IDOR in `api/data/invite` DELETE by validating invitation exists before deletion
- Fixed IDOR in `api/data/notifications` GET and PATCH by using authenticated userId instead of client-provided userId

### Input Validation (Applied across all data endpoints)
- Added boardId, areaId, cardId, card, content, notificationId parameter validation to ensure positive integers
- Added validation for shared parameter in `api/data/boards` to ensure proper boolean handling
- Added boardId input validation in `api/data/invite` to ensure positive integer
- Fixed undefined boardId variable in `api/data/cardOrder` socket event emit
- Updated `InviteModal.vue` to use boardId and userId (instead of deleteUser) in DELETE request URL
- Added Number() conversion for boardId prop in `InviteModal.vue`

### Information Leakage Prevention
- Changed all error messages from specific ("Board not found", "Card not found", "Area ID is required") to generic "Resource not found" or "Invalid request" in all data endpoints to prevent enumeration
- Fixed internal error details leakage in `api/data/cardOrder` inner catch handler
- Fixed typo in `api/data/cardOrder` error message from "Internal Server error" to "Internal server error"
- Fixed internal error details leakage in `api/data/comment` by removing details from error response
- Removed client-provided userId parameter from `api/data/notifications` GET endpoint

### Session Management Endpoints
- Fixed missing import in `api/auth/sign-in` by uncommenting createSession import
- Fixed HTTP status code in `api/auth/sign-in` and `api/auth/sign-up` from 403 to 405 Method Not Allowed for non-POST requests
- Added input validation in `api/auth/sign-in` for email format and minimum password length
- Fixed timing attack vulnerability in `api/auth/sign-in` by adding constant-time bcrypt comparisons for non-existent users and accounts
- Fixed CRITICAL session token leakage in `api/auth/get-session` by removing token from response data
- Fixed banned user information disclosure in `api/auth/get-session` by removing banReason and banExpires from response
- Fixed missing import in `api/auth/get-session` by adding getCookie and bcrypt imports
- Added session token format validation in `api/auth/get-session` to reject malformed tokens
- Added timing attack protection in `api/auth/get-session` with constant-time bcrypt comparisons for failed session and user lookups
- Fixed information leakage in `api/auth/sign-out` by using generic "Logout failed" error message
- Added session token format validation in `api/auth/sign-out` to reject malformed tokens
- Fixed session enumeration in `api/auth/sign-out` by checking affectedRows before returning success

### User Registration & Password Management
- Fixed timing attack vulnerability in `api/auth/sign-up` by adding constant-time bcrypt comparisons for existing email checks
- Added input validation in `api/auth/sign-up` for email format, password length (min 8 chars), and required fields
- Added database transaction in `api/auth/sign-up` for atomic user and account creation
- Fixed silent error swallowing in `api/auth/sign-up` session check to properly log errors
- Fixed timing attack vulnerability in `api/auth/request-password` by always generating token and using same code path regardless of user existence
- Added strong email validation regex in `api/auth/request-password` replacing weak `includes(@)` check
- Fixed inconsistent success messages in `api/auth/request-password` by always returning same message (prevents user enumeration)
- Fixed timing attack vulnerability in `api/auth/reset-password` by adding constant-time bcrypt comparisons for token and user existence checks
- Added token format validation (UUID v4 regex) in `api/auth/reset-password` to reject malformed tokens
- Changed error messages in `api/auth/reset-password` to generic INVALID_TOKEN, INVALID_PASSWORD, INTERNAL_SERVER_ERROR for consistent translation keys
- Changed success message in `api/auth/reset-password` to PASSWORD_RESET_SUCCESSFUL for translation consistency

### User Profile & Password Update
- Applied generic error messages in `api/auth/update-user` (maintaining raw format for translation keys)
- Added image field validation in `api/auth/update-user` to accept http/https URLs, base64 data URIs, relative paths (/, ./, ../), or null while blocking dangerous schemes like javascript:
- Added image size limit (1MB) in `api/auth/update-user` to prevent DoS attacks with huge base64 strings
- Fixed timing attack vulnerability in `api/auth/update-password` by adding constant-time bcrypt comparisons for account existence check
- Added password inequality check in `api/auth/update-password` by checking old !== new password and returning OLD_NEW_SAME error
- Fixed undefined SQL parameter error in `api/auth/update-password` by getting current session token directly from request (cookie/Authorization header) instead of from session object
- Updated error messages in `api/auth/update-password` to BOTH_PASSWORDS_REQUIRED, PASSWORD_TOO_SHORT, OLD_NEW_SAME for clearer translation keys
- Fixed ZodError handling in `PasswordForm.vue` by removing incorrect JSON.parse call and using `e.errors[0]?.code` directly

### Admin Endpoints
- Applied generic error codes and input validation across all admin endpoints (`create`, `list`, `update`, `delete`)
- Added UUID validation for userId in `admin/create`, `admin/update`, `admin/delete`
- Added strong email validation regex in `admin/create` and `admin/update`
- Added input length limits (255 chars) for name, email, password in `admin/create` and `admin/update`
- Added database transactions in `admin/create`, `admin/update`, `admin/delete` for atomic operations with proper rollback
- Added timing attack protection with constant-time bcrypt comparisons in `admin/create`, `admin/update`, `admin/delete`

### API Key Management
- Fixed CRITICAL security vulnerability in `api/auth/api-key/create` by removing full API key secret from response (now returns only id, name, start prefix, expiresAt)
- Fixed response ID issue in `api-key/create` by returning actual database ID
- Added input validation with name length limit (255 chars) in `api-key/create`
- Added expiresIn validation (positive number, max 365 days) in `api-key/create`
- Applied generic error codes in `api-key/create`, `api-key/list`, `api-key/delete`
- Added UUID validation for keyId in `api-key/delete` to reject malformed IDs
- Fixed information leakage in `api-key/delete` by removing ownership-revealing message
- Added timing attack protection with constant-time bcrypt comparisons in `api-key/delete`
- Fixed specific error message in `api/auth/api-key/delete` that revealed key ownership ("API key not found or doesn't belong to you" → "API_KEY_NOT_FOUND")

### Utility Functions (`server/utils/auth.ts`)
- Fixed timing attack vulnerability in verifyApiKey by adding constant-time bcrypt comparisons for both key existence and expiration checks
- Fixed information leakage in verifyApiKey by using generic error codes (INVALID_API_KEY, API_KEY_VERIFICATION_FAILED) instead of specific messages
- Added API key input validation in verifyApiKey with length limit (64 chars) to prevent abuse
- Added userId UUID validation in createSession to reject malformed user IDs
- Fixed information leakage in createSession by using generic error code SESSION_CREATION_FAILED instead of "Failed to create session"

### File Upload Security
- Fixed CRITICAL unauthenticated file upload in `server/api/upload/image.post.ts` by adding early authentication check (session or API key required)
- Fixed missing file validation in `server/api/upload/image.post.ts` by adding magic bytes verification to prevent MIME type spoofing
- Fixed insufficient file type validation in `server/api/upload/image.post.ts` by restricting to whitelisted types (png, jpg, jpeg, gif, webp)
- Fixed file extension spoofing in `server/api/upload/image.post.ts` by using validated MIME type for extension instead of user-provided filename
- Added file size limit (10MB) in `server/api/upload/image.post.ts` to prevent DoS via large uploads
- Fixed information leakage in `server/api/upload/image.post.ts` by removing original filename from response and using generic error messages
- Added user authentication context in `server/api/upload/image.post.ts` by importing and using getSession and getApiKeyUser for auth verification
- Fixed CRITICAL unauthenticated file upload in `server/api/upload.post.ts` by adding early authentication check (session or API key required)
- Fixed missing file validation in `server/api/upload/post.ts` by adding magic bytes verification for all allowed file types (PDF, DOC, DOCX, XLS, XLSX, CSV, PPT, PPTX, JPEG, PNG, ZIP) to prevent MIME type spoofing
- Fixed file extension spoofing in `server/api/upload/post.ts` by using validated file type for extension instead of user-provided filename
- Added file size limit (50MB) in `server/api/upload.post.ts` to prevent DoS via large uploads
- Fixed information leakage in `server/api/upload/post.ts` by removing original filename from response and using generic error messages
- Added user authentication context in `server/api/upload/post.ts` by importing and using getSession and getApiKeyUser for auth verification

### File Serving Security
- Fixed path traversal vulnerability in `server/api/uploads/[...path].ts` by using path.normalize and path.resolve with directory boundary check
- Fixed information leakage in `server/api/uploads/[...path].ts` by using generic error messages ("Invalid request", "Resource not found", "Download failed") instead of specific ones
- Fixed filename leakage in `server/api/uploads/[...path].ts` Content-Disposition header by using safe basename from resolved path instead of user-provided path

### Dependencies
- Updated @nuxtjs/mcp-toolkit
- Updated @nuxtjs/i18n
- Updated @tailwindcss/vite
- Updated tailwindcss
- Updated mysql2

## v0.10.1

### Webapp
- Fixed an issue with additional ":" characters in some notification mails
- Added missing paragraph elements in notification mails
- Removed unnecessary dependencies
- Updated dependencies

### Docs
- Updated migration docs
- Removed unnecessary dependencies
- Updated dependencies

## v0.10.0 - Complete Authentication System Overhaul

### 🚀 Major Architecture Change: Dropped better-auth
**Breaking Change**: Replaced entire `better-auth` dependency with custom authentication system for improved reliability, performance, and maintainability. Backup your database and merge it with the adjusted structure. User passwords need to be reseted.

### 🔄 Real-Time Event Enhancements
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
