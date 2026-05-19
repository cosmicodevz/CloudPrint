"""
print-agent/config.py — Agent configuration
Edit these values to match your environment, or set env variables.
"""
import os

# Backend server URL (no trailing slash)
SERVER_URL   = os.getenv("SERVER_URL",   "http://localhost:5000")
SOCKET_URL   = os.getenv("SOCKET_URL",   "http://localhost:5000")

# Must match AGENT_SECRET in backend .env
AGENT_SECRET = os.getenv("AGENT_SECRET", "your_agent_secret_change_this_in_production")

# Unique identifier for this agent — must match the agentId set in the printer record
AGENT_ID     = os.getenv("AGENT_ID",     "agent-001")

# Windows printer name (e.g. "HP LaserJet Pro") — leave empty for system default
PRINTER_NAME = os.getenv("PRINTER_NAME", "")

# Seconds between HTTP polls (used alongside WebSocket as a fallback)
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "5"))

# Directory for downloaded print files
DOWNLOAD_DIR  = os.getenv("DOWNLOAD_DIR", "./downloads")

# Logging level: DEBUG, INFO, WARNING, ERROR
LOG_LEVEL     = os.getenv("LOG_LEVEL", "INFO")
