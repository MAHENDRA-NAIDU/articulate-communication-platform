# 🎙️ Articulate — Communication Practice Platform

A full-stack, responsive **MERN (MongoDB, Express, React, Node.js)** platform designed for students, job seekers, and learners to develop speaking confidence, upload short video drills, and receive kind, constructive feedback from a supportive community.

---

## 🎨 Visual Design & UI System

The application features a warm, minimalist design language inspired by modern editorial web design:
- **Warm Cream & Off-White Canvas**: (`#FAF7F2`, `#FDFBF7`, `#F3ECE1`)
- **Deep Charcoal / Espresso Typography**: (`#191716`, `#292524`)
- **Terracotta / Burnt Coral Accents**: (`#E05D38`, `#C94C29`)
- **Crisp Surfaces**: Thin 1px subtle borders (`#EDE7DD`), rounded cards (16px–24px), diffuse drop shadows, and smooth hover micro-transitions.
- **Modern Typography**: Google Fonts (*Fraunces* for humanist editorial headings + *Plus Jakarta Sans* for clean, modern body text).

---

## 🚀 Key Features

### 1. Landing & Discovery (Home)
- Large hero headline: *"Speak. Practice. Improve."* with instant video practice card preview.
- "Why This Platform?" 4-pillar growth breakdown (Practice Regularly, Get Feedback, Learn From Others, Track Journey).
- Interactive 6-step habit workflow and latest community practice video cards.

### 2. Video Feed & Explore
- Category filtering: `Self Introduction`, `Interview Practice`, `Group Discussion`, `Daily Life`, `Technology`, `Debate`, `Storytelling`, `College`, `General`.
- Search by keyword, topic, or speaker name.
- Sorting by *Newest*, *Most Feedback*, *Most Viewed*, and *Oldest*.

### 3. Video Upload & Live Preview
- Drag-and-drop video file dropzone (MP4, WebM, MOV up to 100MB).
- In-browser HTML5 video preview.
- **One-click Canvas Frame Snapshot**: Capture video thumbnail frames on the fly without external tools.
- Speaking topic category selector, title, and practice goals context.
- Dual storage engine: Seamless Cloudinary upload integration with resilient local fallback (`/uploads`).

### 4. Video Details & Constructive Feedback
- Custom HTML5 responsive video player with scrubber, time display, volume, and fullscreen.
- Speaker bio card with direct profile navigation.
- Constructive feedback suggestions bar (Pacing, Eye Contact, Filler Words, STAR structure).
- Comment deletion permissions: Comment author OR Video owner (for self-moderation) OR Administrator.
- Edit video modal & deletion actions for video owners.

### 5. User Profiles
- User avatars, practice statistics (total videos uploaded, feedback received, drill views).
- Editable profile name, bio, and avatar.
- User's uploaded practice video gallery.
- Safe account deletion with cascading cleanup of videos, comments, and media files.

### 6. Security, Authentication & Verification
- JWT-based authentication via HTTP-only cookies and Authorization Bearer header fallback.
- **Email Verification via 6-Digit OTP**: SHA-256 hashed storage, 10-minute expiry, max 5 attempts tracking, anti-flooding resend cooldown.
- **Google Sign-In / OAuth 2.0**: Verified Google Identity Services (GIS) integration via `google-auth-library`. Anti-account-takeover protection strictly prohibits auto-linking existing password accounts.
- Password hashing with `bcryptjs`.
- Role-based authorization (`user` & `admin`).
- Secure admin registration protected by server-side `ADMIN_INVITE_SECRET`.
- Administrator Dashboard (`/admin`):
  - Overview platform metrics (Users, Videos, Comments).
  - User management (search, suspend, activate, delete).
  - Video moderation (search, direct inspection, deletion).
  - Comment moderation across the entire platform.

### 7. Future AI Architecture Readiness
The database and backend models are structured with an extensible `aiAnalysis` schema (status, transcript, words-per-minute, filler words, clarity score, recommendations) allowing automated speech-to-text and AI speaking analysis engines to be plugged in effortlessly.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite 6, React Router DOM 6, Lucide React icons, Google Identity Services, Native CSS & CSS Modules.
- **Backend**: Node.js, Express.js, MongoDB, Mongoose, Multer, Cloudinary SDK, Resend SDK, Google Auth Library, Cookie-Parser, CORS, Rate-Limiting.

---

## 🏃 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://127.0.0.1:27017` (or MongoDB Atlas URI).

### 2. Install Dependencies
```bash
# Install root, server, and client dependencies
npm install
npm install --prefix server
npm install --prefix client
```

### 3. Seed Sample Database
Populate realistic speaking videos, constructive feedback, and test accounts:
```bash
npm run seed
```

### 4. Start Development Servers
```bash
# Starts both Express Backend (Port 5000) and Vite Frontend (Port 5173) concurrently
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 📡 API Overview

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new learner (creates pending unverified user & dispatches OTP) | Public |
| `POST` | `/api/auth/verify-email` | Verify 6-digit OTP and activate account | Public |
| `POST` | `/api/auth/resend-verification` | Resend verification code (rate-limited) | Public |
| `POST` | `/api/auth/google` | Verify Google ID token and sign in / register | Public |
| `POST` | `/api/auth/login` | Login and issue session cookie/token (blocks unverified users) | Public |
| `POST` | `/api/auth/forgot-password` | Request password recovery email (single-use token) | Public |
| `POST` | `/api/auth/reset-password` | Reset password using single-use crypto token | Public |
| `PUT` | `/api/auth/change-password` | Change account password (requires current password) | Private |
| `POST` | `/api/auth/logout` | Clear auth cookie | Public |
| `GET` | `/api/auth/me` | Fetch active user session | Private |
| `GET` | `/api/videos` | List videos with filters, search, sort | Public |
| `POST` | `/api/videos` | Upload & publish video | Private |
| `GET` | `/api/videos/:id` | Get video details and increment views | Public |
| `PUT` | `/api/videos/:id` | Update title, description, category | Private (Owner/Admin) |
| `DELETE` | `/api/videos/:id` | Delete video, media, and comments | Private (Owner/Admin) |
| `GET` | `/api/comments/video/:videoId` | Get comments for video | Public |
| `POST` | `/api/comments/video/:videoId` | Post constructive feedback comment | Private |
| `DELETE` | `/api/comments/:id` | Delete feedback comment | Private (Author/Video Owner/Admin) |
| `GET` | `/api/users/:identifier` | Get profile and practice drills | Public |
| `PUT` | `/api/users/:id` | Update profile name, bio, avatar | Private (Owner/Admin) |
| `DELETE` | `/api/users/:id` | Delete account and cascade content | Private (Owner/Admin) |
| `GET` | `/api/admin/stats` | Platform statistics | Private (Admin only) |
| `GET` | `/api/admin/users` | List users for moderation | Private (Admin only) |
| `PATCH` | `/api/admin/users/:id/status` | Suspend / activate user | Private (Admin only) |
| `DELETE` | `/api/admin/users/:id` | Permanently delete user | Private (Admin only) |
| `GET` | `/api/admin/videos` | List all videos for moderation | Private (Admin only) |
| `DELETE` | `/api/admin/videos/:id` | Delete video as admin | Private (Admin only) |
| `GET` | `/api/admin/comments` | List all comments for moderation | Private (Admin only) |
| `DELETE` | `/api/admin/comments/:id` | Delete comment as admin | Private (Admin only) |

---

## 🔒 Automated Security & Integrity Suite

Articulate contains an automated 49-test security suite that executes against an isolated database (`articulate_test_isolated`) without modifying primary development or seed data:

```bash
npm run test:security
# or
npm test --prefix server
```

Tests cover:
- Modern defensive security headers (`nosniff`, `frameguard`, CSP with Google GIS origins, Referrer-Policy).
- CSRF origin verification on state-changing cookie requests.
- Account recovery token hashing (SHA-256), expiration, and single-use atomic consumption.
- Password change session invalidation (`tokenVersion` and `passwordChangedAt` cross-checks).
- Admin registration invite key timing-safe comparison (`crypto.timingSafeEqual`).
- Email verification 6-digit OTP lifecycle (SHA-256 hash storage, expiration, max 5 attempts tracking, atomic clearance).
- Google Identity Services token verification, audience check, and strict anti-account-takeover protection.
- Search regex ReDoS sanitization (`escapeRegex`).
- File upload extension whitelist and MIME type cross-validation.
- Rate limiters across authentication, recovery, verification, and comment endpoints.

---

## ☁️ Production Deployment Guide

Articulate is configured for a standard two-tier deployment: **Render** (Node.js Backend) and **Vercel** (Vite React Frontend), or as a monolithic deployment on Render.

### 1. External Services Setup

#### A. MongoDB Atlas (Cloud Database)
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Under **Network Access**, allow access from your backend service IP (or `0.0.0.0/0` for dynamic cloud hosting like Render).
3. Under **Database Access**, create a database user and password.
4. Copy your connection string into `MONGODB_URI` in your backend environment:
   ```text
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/communication_practice?retryWrites=true&w=majority
   ```

#### B. Resend (Email Delivery)
1. Create an account at [resend.com](https://resend.com).
2. Generate an API Key in your dashboard.
3. For immediate testing, you can send from `Articulate <onboarding@resend.dev>` to your registered email address.
4. For production, add your domain under **Domains** in Resend, add the provided DNS records (DKIM and SPF) at your domain registrar, and configure `MAIL_FROM=Articulate <no-reply@yourdomain.com>`.
5. Test delivery directly from the command line:
   ```bash
   node server/scripts/testEmailDelivery.js your-email@example.com
   ```

#### C. Cloudinary (Managed Media Storage)
1. Sign up for a free account at [cloudinary.com](https://cloudinary.com).
2. Obtain your **Cloud Name**, **API Key**, and **API Secret** from the dashboard.
3. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in your backend environment.
4. When configured, videos and thumbnails are automatically hosted on Cloudinary's global CDN with chunked uploads (`upload_large`).

#### D. Google Cloud Console (Google Sign-In)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Under **APIs & Services > OAuth consent screen**, select **External**, fill in app details, and publish or add test users.
4. Under **APIs & Services > Credentials**, click **Create Credentials > OAuth client ID**.
5. Select **Web application**:
   - **Authorized JavaScript origins**:
     - Development: `http://localhost:5173`
     - Production: `https://your-frontend-domain.vercel.app`
   - **Authorized redirect URIs**:
     - Development: `http://localhost:5173`
     - Production: `https://your-frontend-domain.vercel.app`
6. Copy the generated **Client ID**:
   - Set in backend `.env`: `GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com`
   - Set in frontend `.env`: `VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com`

---

### 2. Backend Deployment (Render Web Service)
1. Connect your repository to Render as a **Web Service**.
2. **Root Directory:** `server` (or run from root with build command).
3. **Build Command:** `npm install`
4. **Start Command:** `node server.js`
5. **Environment Variables:**
   - `NODE_ENV=production`
   - `PORT=5000` (or Render default `$PORT`)
   - `MONGODB_URI=mongodb+srv://...`
   - `JWT_SECRET=<generate_a_random_32_plus_character_string>`
   - `JWT_EXPIRES_IN=7d`
   - `ADMIN_INVITE_SECRET=<choose_a_strong_admin_key>`
   - `CLIENT_URL=https://your-frontend-app.vercel.app`
   - `RESEND_API_KEY=re_...`
   - `MAIL_FROM=Articulate <onboarding@resend.dev>`
   - `RESET_TOKEN_EXPIRES_MINUTES=15`
   - `OTP_EXPIRES_MINUTES=10`
   - `GOOGLE_CLIENT_ID=...apps.googleusercontent.com`
   - `CLOUDINARY_CLOUD_NAME=...`
   - `CLOUDINARY_API_KEY=...`
   - `CLOUDINARY_API_SECRET=...`
   - `TRUST_PROXY=1`
   - `COOKIE_SAMESITE=none` *(if frontend and backend are on separate domains)*
   - `COOKIE_SECURE=true`

---

### 3. Frontend Deployment (Vercel)
1. Import the repository on [vercel.com](https://vercel.com).
2. **Root Directory:** `client`
3. **Framework Preset:** Vite
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. **Environment Variables:**
   - `VITE_API_URL=https://your-backend-service.onrender.com/api`
   - `VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com`
7. In `client/vercel.json`, ensure SPA rewrites route all paths to `/index.html`:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
