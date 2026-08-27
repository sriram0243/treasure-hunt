# 🏴‍☠️ College Event 7-Stage Interactive Treasure Hunt Web Application

An interactive full-stack college event Treasure Hunt web application built with **React**, **Express.js**, **SQLite / MySQL**, and **Tailwind CSS**.

Participants physically explore the campus, find hidden QR codes at landmark locations, scan them with their phone camera, unlock ancient parchment clues, progress through 7 strictly enforced stages, and reach the final gold treasure chest!

---

## 🌟 Key Features

1. **7 Linear Stages & Cryptographic QR Codes**:
   - Strictly enforced stage progression (Stage 1 → 2 → ... → 7).
   - Server-side cryptographic token validation prevents stage skipping or URL tampering.
   - Detailed scan feedback for **WRONG MARK** (scanned out-of-order stage mark) and **UNKNOWN MARK**.

2. **Mobile Camera QR Scanner**:
   - In-browser mobile camera scanner using `html5-qrcode`.
   - Supports camera switching, permission error handling with retry UI, image file upload, and manual token input fallback.

3. **Adventure UI & Sound System**:
   - Ancient treasure map visual identity, glowing gold accents, and parchment cards.
   - Dynamic Web Audio API synthesizer SFX (scan beep, stage unlock chime, wrong scan buzz, victory fanfare) with global 🔊 SOUND ON/OFF toggle.

4. **Victory Sequence & Player Feedback**:
   - Golden confetti particle explosion (`canvas-confetti`) and animated treasure chest on Stage 07 completion.
   - Interactive feedback collection (star ratings, emoji reactions, player comments).

5. **Admin Control Center**:
   - Dashboard with real-time statistics (total players, active hunters, completed, scan success rate).
   - Stage progression distribution visual charts & live scan attempt logs table.
   - **QR Code Management**: High-res PNG & SVG downloads + printable 7-QR sheet for physical campus deployment.

---

## 🚀 Quick Setup & Run Instructions

### 1. Install Backend Dependencies & Start Server
```bash
cd backend
npm install
npm start
```
*The backend automatically seeds the database, populates default clues, creates the default admin user, and generates high-res QR files (`qr-stage-01.png` to `07.png` & SVG versions) inside the `/qr-codes` folder.*

### 2. Start Frontend Dev Server
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 🔑 Admin Access
- **URL**: Click the Shield Icon (`🛡️`) in the top navigation bar or navigate to the Admin Gateway.

---

## 📂 Project Structure

```text
treasure-hunt/
├── backend/
│   ├── config/
│   │   └── db.js                 # SQLite DB initialization & auto-seeding
│   ├── controllers/
│   │   ├── gameController.js      # Player sessions, QR validation, clue unlocking
│   │   └── adminController.js     # Analytics, scan logs, QR code listings
│   ├── middleware/
│   │   └── authMiddleware.js     # Admin JWT authentication
│   ├── routes/
│   │   ├── gameRoutes.js
│   │   └── adminRoutes.js
│   ├── services/
│   │   └── qrGenerator.js        # High-res PNG & SVG QR generator
│   ├── server.js                 # Express server & static asset host
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js         # REST API wrapper
│   │   ├── components/
│   │   │   ├── Header.jsx        # Navigation & sound toggle
│   │   │   ├── ProgressBar.jsx   # 7-node treasure map progress
│   │   │   ├── ScannerModal.jsx  # Mobile camera QR scanner
│   │   │   └── ClueCard.jsx      # Typewriter parchment clue reveal
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx   # Hero section & player registration
│   │   │   ├── HowToPlayPage.jsx # 7-step interactive guide
│   │   │   ├── GameView.jsx      # Main 7-stage game interface
│   │   │   ├── VictoryPage.jsx   # Stage 7 celebration & feedback form
│   │   │   ├── AdminDashboard.jsx# Real-time analytics & scan logs
│   │   │   └── AdminQRPage.jsx   # Printable QR management
│   │   ├── utils/
│   │   │   └── soundEffects.js   # Web Audio API sound synthesizer
│   │   ├── App.jsx
│   │   ├── index.css             # Custom adventure CSS theme
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── database/
│   └── schema.sql                # Relational SQL schema for MySQL/SQLite
├── qr-codes/                      # Auto-generated PNG and SVG files (01-07)
└── README.md
```

---

## 📄 License & Event Usage
Built for College Technical Events and Campus Treasure Hunts. Free to modify clues in `backend/config/db.js`.
