# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-01

### Added
- Initial release of nodejs-insta-private-api
- Full Instagram Private API implementation in pure JavaScript (CommonJS)
- Authentication system with username, password, and email
- Direct messaging functionality (send text, images, videos)
- Group messaging support
- Story interactions (react, view, upload)
- Feed operations (upload posts, like, comment, browse)
- User management (follow, unfollow, search)
- Media operations (like, unlike, comment, delete)
- Location-based features
- Hashtag operations
- Live streaming support
- Story highlights management
- Search functionality
- Session management with cookie persistence
- Comprehensive error handling with specific error types
- Rate limiting and retry logic
- File validation utilities
- Over 50 methods covering most Instagram features
- Extensive documentation and examples
- Type definitions for better code organization

### Features
- 🔐 **Authentication** - Login with username/password/email
- 💬 **Direct Messages** - Send text, images, videos to users and groups
- 📱 **Stories** - React, upload, view story feeds and highlights
- 📸 **Feed** - Upload photos/videos, like, comment, browse timeline
- 👥 **Users** - Follow, unfollow, search, get user info
- 📍 **Locations** - Search locations, get location feeds
- #️⃣ **Hashtags** - Follow hashtags, get hashtag feeds
- 🎥 **Live** - Create and manage live streams
- 🔍 **Search** - Unified search for users, hashtags, locations
- 🍪 **Sessions** - Save and restore login sessions
- ⚡ **Performance** - Optimized requests with retry logic
- 🛡️ **Security** - Proper request signing and encryption
- 📊 **Analytics** - Media insights and statistics

### Technical Details
- Pure JavaScript (CommonJS) - No TypeScript dependencies
- Node.js >= 14.0.0 compatibility
- Modular architecture with repositories and services
- Comprehensive error handling with 20+ specific error types
- Built-in rate limiting and retry mechanisms
- Session persistence with cookie management
- File upload support for images and videos
- Request signing with Instagram's signature algorithm
- Device simulation for authentic requests
- Extensive utility functions for common operations

### Dependencies
- `axios` - HTTP client for API requests
- `tough-cookie` - Cookie management and persistence
- `form-data` - Multipart form data for file uploads
- `chance` - Random data generation for device simulation
- `lodash` - Utility functions for data manipulation
- `crypto` - Cryptographic functions for request signing
- `uuid` - UUID generation for device identification

### Repository Structure
- `src/core/` - Core classes (Client, State, Request, Repository)
- `src/repositories/` - API endpoint repositories
- `src/services/` - High-level service classes
- `src/utils/` - Utility functions and helpers
- `src/constants/` - API constants and configuration
- `src/errors/` - Error classes and definitions
- `src/types/` - Type definitions and interfaces
- `examples/` - Usage examples and documentation
- `README.md` - Comprehensive documentation

### Supported Operations
1. **Authentication**
   - Username/password login
   - Email-based login
   - Two-factor authentication handling
   - Session save/restore
   - Session validation

2. **Direct Messages**
   - Send text messages
   - Send images and videos
   - Group messaging
   - Inbox management
   - Thread operations

3. **Stories**
   - React to stories
   - Upload story content
   - View story feeds
   - Story highlights management
   - Story viewers tracking

4. **Feed Operations**
   - Upload photos and videos
   - Carousel posts (multiple media)
   - Like and unlike posts
   - Comment on posts
   - Browse various feeds

5. **User Management**
   - Search users
   - Follow/unfollow users
   - Get user information
   - Manage friendships
   - Block/unblock users

6. **Advanced Features**
   - Location-based operations
   - Hashtag following
   - Live streaming
   - Search functionality
   - Media insights

### Files Count
- **Total Files**: 56+ files
- **JavaScript Files**: 26 files
- **Documentation**: README.md, CHANGELOG.md, example.js
- **Configuration**: package.json
- **Utilities**: 30+ helper files

This release provides a complete, production-ready Instagram Private API client that maintains compatibility with the original instagram-private-api while being written in pure JavaScript without TypeScript dependencies.