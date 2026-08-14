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

### 6. Security & Admin Dashboard
- JWT-based authentication via HTTP-only cookies and Authorization Bearer header fallback.
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

- **Frontend**: React 18, Vite 6, React Router DOM 6, Lucide React icons, Native CSS & CSS Modules.
- **Backend**: Node.js, Express.js, MongoDB, Mongoose, Multer, Cloudinary SDK, Cookie-Parser, CORS, Rate-Limiting.

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
| `POST` | `/api/auth/register` | Register new learner (or admin with key) | Public |
| `POST` | `/api/auth/login` | Login and issue session cookie/token | Public |
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
