# Academic Management System (AMS) - Front-End Web Application

A modern, responsive, high-performance React web application for university academic management, student registration, faculty grading, and automated grade notification tracking.

---

## 🌟 Key Features & Experience

### 🔐 1. Shared Authentication & Role Routing
- **Dual Role Access**: Support for both **Student** and **Faculty** portals (plus Admin mode) via a shared login interface.
- **1-Click Demo Logins**: Pre-configured buttons to instantly test Student (`STU101`, `STU102`) and Faculty (`FAC201`, `FAC202`) roles without typing.
- **JWT Authorization**: Transparent token storage and API header injection.

### 🎓 2. Student Portal Capabilities
- **Personal Profile Card**: Displays Roll Number, Department, Program (e.g. B.Tech Computer Science), Section, and Year.
- **Active Semester Course Registration**: View available courses open for enrollment during the active registration window and register with instant state sync.
- **Complete Academic History**: Access full course registration records spanning **all historical semesters**, not just the current term.
- **Official Grade Transcript**: Real-time view of published marks and letter grades (`A+`, `A`, `B+`, `B`, `C+`, `C`, `D`, `F`) with automatic **CGPA calculation**.

### 👨‍🏫 3. Faculty Portal Capabilities
- **Faculty Profile Card**: Displays Employee ID, Department, Designation, and contact metrics.
- **Taught Course Management**: Clear separation between active semester courses and previous semester historical courses.
- **Enrolled Student Roster**: View student details and current grading status per course offering.
- **Individual Grade Entry**: Submit or update grades for a specific student with custom faculty feedback.
- **Bulk CSV Grade Upload**: Batch upload grades for an entire course via `.csv` file upload or raw CSV text editor, featuring **per-row validation error reports** (e.g., flagging invalid roll numbers) without failing the whole batch.

### 📧 4. Grade Notification & Email Audit
- **Sync & Verification**: Uploaded/updated grades are immediately synced to the student portal.
- **Email Notification Audit Modal**: Inspect real-time server-side email dispatch logs for student grade notifications.

---

## 🛠️ Technology Stack

- **Framework**: React 19 (JSX)
- **Bundler & Dev Server**: Vite
- **Styling**: Modern Vanilla CSS with dark/glassmorphic aesthetics, custom color palettes, CSS grid layouts, and micro-animations.
- **State Management**: React Hooks (`useState`, `useEffect`)

---

## ⚙️ Environment Variables

Configure environment variables in a `.env` file in `ams-frontend`:

| Variable Name | Default Value | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080` | URL of the backend Go API server |

---

## 🚀 Setup & Local Execution

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation & Run

1. Navigate to the frontend directory:
   ```bash
   cd ams-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```
   The web application will open at `http://localhost:5173`.

4. Build production bundle:
   ```bash
   npm run build
   ```

---

## 🌐 Deployment Instructions

### Option 1: Vercel / Netlify
1. Connect your repository to Vercel or Netlify.
2. Build Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Environment Variable:
   - `VITE_API_URL` = `<your-deployed-go-backend-url>` (e.g., `https://ams-backend.onrender.com`)

### Option 2: Render Static Site
1. Create a new **Static Site** on Render.
2. Set Build Command: `npm run build`
3. Set Publish Directory: `dist`
4. Add Environment Variable: `VITE_API_URL`.
