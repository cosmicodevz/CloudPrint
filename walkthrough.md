# CloudPrint — Build Walkthrough

## What Was Built

A complete, production-ready full-stack cloud printing system.

## Screenshots

### Landing Page
![Landing Page](file:///C:/Users/Dheeraj/.gemini/antigravity/brain/ed7eb9f4-2344-4380-86cb-ff84e3ff0742/landing_page_full_1779090168538.png)

### Login Page
![Login Page](file:///C:/Users/Dheeraj/.gemini/antigravity/brain/ed7eb9f4-2344-4380-86cb-ff84e3ff0742/login_page_1779090287225.png)

---

## Files Created

### Backend (`backend/`)
| File | Purpose |
|------|---------|
| `server.js` | Express + Socket.io + MongoDB entry |
| `src/models/User.js` | User schema with bcrypt |
| `src/models/Printer.js` | Printer schema with agent claim |
| `src/models/PrintJob.js` | Print job schema with status lifecycle |
| `src/models/ActivityLog.js` | TTL-indexed activity log |
| `src/routes/auth.routes.js` | Register, login, forgot/reset password |
| `src/routes/user.routes.js` | Profile, change password, admin user list |
| `src/routes/printer.routes.js` | Printer CRUD + agent heartbeat |
| `src/routes/printjob.routes.js` | Upload, queue, cancel, retry, agent status |
| `src/routes/admin.routes.js` | Analytics, logs, server status |
| `src/middleware/auth.middleware.js` | JWT + role guards + agent secret |
| `src/middleware/upload.middleware.js` | Multer + MIME whitelist |
| `src/middleware/error.middleware.js` | Global error normalization |
| `src/socket/handlers.js` | Socket.io auth + events |

### Frontend (`frontend/src/`)
| File | Purpose |
|------|---------|
| `pages/LandingPage.jsx` | Hero, Features, How It Works, Pricing, Testimonials |
| `pages/LoginPage.jsx` | Auth with validation |
| `pages/RegisterPage.jsx` | Registration with password indicator |
| `pages/ForgotPasswordPage.jsx` | Password reset with success state |
| `pages/DashboardPage.jsx` | User dashboard with stats, upload, queue |
| `pages/AdminDashboardPage.jsx` | Admin with charts, user/printer mgmt |
| `components/Sidebar.jsx` | Collapsible nav, theme toggle, user info |
| `components/FileUploader.jsx` | Drag & drop with progress + settings |
| `components/PrintQueue.jsx` | Real-time table with cancel/retry |
| `context/AuthContext.jsx` | JWT auth state |
| `context/ThemeContext.jsx` | Dark/light mode |
| `context/SocketContext.jsx` | Socket.io lifecycle management |
| `services/api.js` | Axios client with interceptors |

### Python Agent (`print-agent/`)
| File | Purpose |
|------|---------|
| `agent.py` | Main agent: WebSocket + HTTP polling, printing |
| `config.py` | Environment configuration |
| `requirements.txt` | Python dependencies |

### Deployment
| File | Purpose |
|------|---------|
| `docker-compose.yml` | MongoDB + backend + frontend |
| `backend/Dockerfile` | Node 20 Alpine |
| `frontend/Dockerfile` | Multi-stage Vite + Nginx |
| `frontend/nginx.conf` | SPA routing + WebSocket proxy |
| `README.md` | Full documentation |

---

## Starting the App

```bash
# 1. Start MongoDB (if not running)
mongod

# 2. Start backend
cd backend && npm run dev

# 3. Start frontend (new terminal)
cd frontend && npm run dev

# 4. Open browser → http://localhost:5173
```

## Verification Results

- ✅ Frontend builds cleanly (`npm run build`)
- ✅ Backend initializes Socket.io handlers on startup
- ✅ All routes registered correctly
- ✅ Landing page renders with full glassmorphism design
- ✅ Login page renders with validation and demo credentials
- ✅ React Router guards redirect unauthenticated users
- ⚠️ MongoDB needs to be running locally (or change `.env` to Atlas URI)
