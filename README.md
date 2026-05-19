# 🖨️ CloudPrint — Full-Stack Cloud Printing System

A production-ready SaaS platform for printing documents remotely to any WiFi-connected printer.

![Tech Stack](https://img.shields.io/badge/Stack-React%20%2B%20Node.js%20%2B%20MongoDB-6366f1?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 🏗️ Architecture

```
Browser (React)  ←→  Express API  ←→  MongoDB
                         ↕ Socket.io
                   Python Print Agent  →  WiFi Printer
```

---

## 📁 Project Structure

```
cloud-printing/
├── frontend/          # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/     # Landing, Login, Register, Dashboard, Admin
│   │   ├── components/# Sidebar, FileUploader, PrintQueue
│   │   ├── context/   # AuthContext, ThemeContext, SocketContext
│   │   └── services/  # Axios API client
│   ├── Dockerfile
│   └── nginx.conf
│
├── backend/           # Node.js + Express
│   ├── src/
│   │   ├── models/    # User, Printer, PrintJob, ActivityLog
│   │   ├── routes/    # auth, users, printers, printjobs, admin
│   │   ├── middleware/ # auth, upload, error
│   │   └── socket/    # Socket.io handlers
│   ├── server.js
│   └── Dockerfile
│
├── print-agent/       # Python desktop agent
│   ├── agent.py
│   ├── config.py
│   └── requirements.txt
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Python 3.9+ (for print agent)
- nodemon (`npm i -g nodemon`)

### 1. Clone & Install

```bash
git clone <repo>
cd cloud-printing

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment

**Backend** — edit `backend/.env`:
```env
MONGO_URI=mongodb://localhost:27017/cloudprint
JWT_SECRET=your_super_secret_key
AGENT_SECRET=your_agent_secret
SERVER_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

**Frontend** — edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

**Print Agent** — edit `print-agent/config.py`:
```python
SERVER_URL   = "http://localhost:5000"
AGENT_SECRET = "your_agent_secret"     # Must match backend
AGENT_ID     = "agent-001"             # Must match printer's agentId in DB
PRINTER_NAME = "HP LaserJet Pro"       # Windows printer name
```

### 3. Start Backend

```bash
cd backend
npm run dev
# Server starts on http://localhost:5000
```

### 4. Start Frontend

```bash
cd frontend
npm run dev
# App opens on http://localhost:5173
```

### 5. Create Admin User

Open MongoDB Compass or use mongosh:
```js
use cloudprint
db.users.updateOne(
  { email: "admin@cloudprint.io" },
  { $set: { role: "admin" } }
)
```

Or seed via API — register at `/register`, then manually update role.

### 6. Start Print Agent

```bash
cd print-agent
pip install -r requirements.txt
python agent.py
```

---

## 🐳 Docker Deployment

```bash
# Copy and edit environment
cp .env.example .env

# Build & run all services
docker compose up --build -d

# View logs
docker compose logs -f backend
```

Frontend: http://localhost  
Backend API: http://localhost:5000/api  
Health check: http://localhost:5000/api/health

---

## 🔑 API Reference

### Authentication
| Method | Endpoint               | Description         |
|--------|------------------------|---------------------|
| POST   | `/api/auth/register`   | Create account      |
| POST   | `/api/auth/login`      | Login → JWT         |
| POST   | `/api/auth/logout`     | Clear session       |
| GET    | `/api/auth/me`         | Get current user    |
| POST   | `/api/auth/forgot-password` | Send reset email |

### Print Jobs
| Method | Endpoint                        | Description         |
|--------|---------------------------------|---------------------|
| POST   | `/api/printjobs`                | Upload & create job |
| GET    | `/api/printjobs`                | List user's jobs    |
| PATCH  | `/api/printjobs/:id/cancel`     | Cancel job          |
| PATCH  | `/api/printjobs/:id/retry`      | Retry failed job    |
| PATCH  | `/api/printjobs/:id/status`     | Agent status update |
| GET    | `/api/printjobs/queue/pending`  | Agent poll endpoint |

### Printers
| Method | Endpoint                        | Description         |
|--------|---------------------------------|---------------------|
| GET    | `/api/printers`                 | List printers       |
| POST   | `/api/printers`                 | Add printer (admin) |
| PATCH  | `/api/printers/:id`             | Update printer      |
| DELETE | `/api/printers/:id`             | Remove printer      |
| POST   | `/api/printers/agent/heartbeat` | Agent heartbeat     |

### Admin
| Method | Endpoint                 | Description       |
|--------|--------------------------|-------------------|
| GET    | `/api/admin/dashboard`   | Analytics stats   |
| GET    | `/api/admin/server-status`| Server metrics   |
| GET    | `/api/admin/activity-logs`| Event logs       |
| GET    | `/api/admin/all-jobs`    | All print jobs    |

---

## 🔌 Socket.io Events

| Event           | Direction       | Description                      |
|-----------------|-----------------|----------------------------------|
| `job:created`   | Server → Client | New job added to queue           |
| `job:updated`   | Server → Client | Job status changed               |
| `job:new`       | Server → Agent  | New job for agent's printer      |
| `printer:status`| Server → Client | Printer came online/offline      |
| `agent:register`| Agent → Server  | Agent claims a printer           |

---

## 🖨️ Print Agent Setup

The Python agent runs on a machine connected to your WiFi printer.

### Windows Requirements
- Python 3.9+
- `pip install pywin32 requests websocket-client`
- SumatraPDF (recommended) or Ghostscript for PDF printing

### Configuration
1. Add a Printer in the Admin Dashboard
2. Set the `agentId` field (e.g., `agent-001`)
3. Set the same `AGENT_ID` in `print-agent/config.py`

### Running as a Windows Service
Use NSSM:
```
nssm install CloudPrintAgent "C:\Python39\python.exe" "C:\path\to\agent.py"
nssm start CloudPrintAgent
```

---

## 🎨 Features

- ✅ JWT Authentication (access + refresh tokens)
- ✅ Drag & drop file upload (PDF, images, Word, Excel)
- ✅ Real-time print queue via Socket.io
- ✅ Print job retry system
- ✅ Role-based access control (User / Admin)
- ✅ Admin analytics dashboard with charts
- ✅ Multi-printer support with online/offline detection
- ✅ Python print agent (WebSocket + HTTP polling fallback)
- ✅ Dark/light mode toggle (persisted)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Activity logs with auto-expire (TTL index)
- ✅ Docker + Nginx deployment
- ✅ File preview before printing (images)
- ✅ QR share token per job

---

## 📄 License

MIT © 2024 CloudPrint
