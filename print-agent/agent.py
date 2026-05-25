#!/usr/bin/env python3
"""
=====================================================================
print-agent/agent.py — CloudPrint Local Print Agent
=====================================================================
A background agent that runs near the WiFi printer, connects to
the CloudPrint server via WebSocket, downloads new print jobs,
sends them to the local printer, and updates status.

This script runs as a System Tray application.

Requirements:
    pip install requests websocket-client pywin32 pystray Pillow
    (Ghostscript installed for PDF printing on Windows)

Usage:
    pythonw agent.py
"""

import os
import sys
import time
import json
import logging
import threading
import tempfile
import subprocess
from pathlib import Path
from datetime import datetime

import requests

try:
    import win32print
    import win32api
    WINDOWS_PRINT = True
except ImportError:
    WINDOWS_PRINT = False
    logging.warning("pywin32 not available — using system print fallback")

try:
    import websocket
    WEBSOCKET_AVAILABLE = True
except ImportError:
    WEBSOCKET_AVAILABLE = False
    logging.warning("websocket-client not installed — using HTTP polling only")

try:
    import pystray
    from PIL import Image, ImageDraw
    PYSTRAY_AVAILABLE = True
except ImportError:
    PYSTRAY_AVAILABLE = False
    logging.warning("pystray or Pillow not installed. System tray icon will not be available.")

# ─────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────
from config import (
    SERVER_URL, SOCKET_URL, AGENT_SECRET, AGENT_ID,
    PRINTER_NAME, POLL_INTERVAL, DOWNLOAD_DIR, LOG_LEVEL
)

# Force UTF-8 on stdout so emoji characters don't crash Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

_log_file = "agent.log"
_stream_handler = logging.StreamHandler(sys.stdout)
_file_handler   = logging.FileHandler(_log_file, encoding="utf-8")

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        _stream_handler,
        _file_handler,
    ]
)
log = logging.getLogger("PrintAgent")

# Global event to signal all threads to shut down gracefully
shutdown_flag = threading.Event()

# ─────────────────────────────────────────────────────────────────────
# HTTP Session with agent auth header
# ─────────────────────────────────────────────────────────────────────
session = requests.Session()
session.headers.update({
    "X-Agent-Secret": AGENT_SECRET,
    "User-Agent": f"CloudPrint-Agent/1.0 ({AGENT_ID})",
})


# ─────────────────────────────────────────────────────────────────────
# Printer Manager
# ─────────────────────────────────────────────────────────────────────
class PrinterManager:
    """Handles sending files to the local printer."""

    def __init__(self, printer_name: str):
        self.printer_name = printer_name or self._get_default_printer()
        log.info(f"Using printer: {self.printer_name}")

    @staticmethod
    def _get_default_printer() -> str:
        if WINDOWS_PRINT:
            return win32print.GetDefaultPrinter()
        return ""

    def print_file(self, filepath: str, copies: int = 1) -> bool:
        """Print a file. Returns True on success."""
        filepath = Path(filepath)
        if not filepath.exists():
            log.error(f"File not found: {filepath}")
            return False

        ext = filepath.suffix.lower()
        try:
            if ext == ".pdf":
                return self._print_pdf(str(filepath), copies)
            elif ext in {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"}:
                return self._print_image(str(filepath), copies)
            elif ext == ".txt":
                return self._print_text(str(filepath), copies)
            else:
                log.warning(f"Unsupported type {ext} — attempting ShellExecute")
                return self._print_shellexec(str(filepath))
        except Exception as e:
            log.error(f"Print error: {e}")
            return False

    def _print_pdf(self, path: str, copies: int) -> bool:
        """Print PDF using Ghostscript (cross-platform) or SumatraPDF."""
        # Try SumatraPDF (Windows)
        sumatra = r"C:\Program Files\SumatraPDF\SumatraPDF.exe"
        if os.path.exists(sumatra):
            cmd = [sumatra, "-print-to", self.printer_name,
                   "-print-settings", f"{copies}x", path]
            result = subprocess.run(cmd, capture_output=True, timeout=120)
            return result.returncode == 0

        # Try Ghostscript
        for gs in ["gswin64c", "gswin32c", "gs"]:
            try:
                cmd = [gs, "-dBATCH", "-dNOPAUSE", "-dNOSAFER",
                       f"-sOutputFile=%printer%{self.printer_name}",
                       f"-dNumCopies={copies}", path]
                result = subprocess.run(cmd, capture_output=True, timeout=120)
                if result.returncode == 0:
                    return True
            except FileNotFoundError:
                continue

        # Windows fallback: ShellExecute print verb
        if WINDOWS_PRINT:
            return self._print_shellexec(path)

        log.error("No PDF printer backend found (install SumatraPDF or Ghostscript)")
        return False

    def _print_image(self, path: str, copies: int) -> bool:
        """Print an image file."""
        if WINDOWS_PRINT:
            for _ in range(copies):
                win32api.ShellExecute(0, "print", path, f'/d:"{self.printer_name}"', ".", 0)
                time.sleep(1)
            return True
        # Linux / macOS
        result = subprocess.run(["lp", "-d", self.printer_name, "-n", str(copies), path],
                                capture_output=True, timeout=60)
        return result.returncode == 0

    def _print_text(self, path: str, copies: int) -> bool:
        if WINDOWS_PRINT:
            for _ in range(copies):
                win32api.ShellExecute(0, "print", path, None, ".", 0)
            return True
        result = subprocess.run(["lp", "-d", self.printer_name, "-n", str(copies), path],
                                capture_output=True, timeout=60)
        return result.returncode == 0

    def _print_shellexec(self, path: str) -> bool:
        if WINDOWS_PRINT:
            win32api.ShellExecute(0, "print", path, None, ".", 0)
            return True
        return False


# ─────────────────────────────────────────────────────────────────────
# Job Processor
# ─────────────────────────────────────────────────────────────────────
class JobProcessor:
    def __init__(self, printer: PrinterManager):
        self.printer    = printer
        self.processing = set()  # Track in-flight job IDs
        Path(DOWNLOAD_DIR).mkdir(parents=True, exist_ok=True)

    def process(self, job: dict):
        """Download and print a job, then update server status."""
        job_id = job["_id"]
        if job_id in self.processing:
            return
        self.processing.add(job_id)

        thread = threading.Thread(target=self._run, args=(job,), daemon=True)
        thread.start()

    def _run(self, job: dict):
        job_id   = job["_id"]
        file_url = job["fileUrl"]
        copies   = int(job.get("copies", 1))
        filename = job.get("fileName", "job.pdf")

        try:
            log.info(f"[{job_id}] Processing: {job.get('originalName', filename)}")
            self._update_status(job_id, "printing")

            # Download file
            dest = Path(DOWNLOAD_DIR) / filename
            self._download(file_url, dest)

            # Print
            success = self.printer.print_file(str(dest), copies=copies)

            # Update status
            if success:
                self._update_status(job_id, "completed")
                log.info(f"[{job_id}] ✅ Completed")
            else:
                self._update_status(job_id, "failed", "Print command returned error")
                log.error(f"[{job_id}] ❌ Failed")

            # Cleanup temp file
            try: dest.unlink(missing_ok=True)
            except: pass

        except Exception as e:
            log.error(f"[{job_id}] Exception: {e}")
            self._update_status(job_id, "failed", str(e))
        finally:
            self.processing.discard(job_id)

    @staticmethod
    def _download(url: str, dest: Path):
        log.info(f"Downloading: {url}")
        r = session.get(url, stream=True, timeout=60)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(8192):
                if shutdown_flag.is_set():
                    log.warning("Shutdown flag set during download, aborting.")
                    break
                f.write(chunk)
        if not shutdown_flag.is_set():
            log.info(f"Downloaded to: {dest}")

    @staticmethod
    def _update_status(job_id: str, status: str, error_msg: str = None):
        url  = f"{SERVER_URL}/api/printjobs/{job_id}/status"
        data = {"status": status}
        if error_msg: data["errorMsg"] = error_msg
        try:
            r = session.patch(url, json=data, timeout=10)
            r.raise_for_status()
            log.info(f"[{job_id}] Status → {status}")
        except Exception as e:
            log.warning(f"[{job_id}] Failed to update status: {e}")


# ─────────────────────────────────────────────────────────────────────
# HTTP Polling Agent (fallback if WebSocket not available)
# ─────────────────────────────────────────────────────────────────────
class PollingAgent:
    def __init__(self, processor: JobProcessor):
        self.processor = processor

    def run(self):
        log.info(f"[Polling] Starting. Interval: {POLL_INTERVAL}s")
        self._heartbeat()
        while not shutdown_flag.is_set():
            try:
                self._poll()
            except Exception as e:
                log.error(f"[Polling] Error: {e}")
            
            # Sleep in small increments to respond to shutdown flag quickly
            for _ in range(POLL_INTERVAL):
                if shutdown_flag.is_set():
                    break
                time.sleep(1)

        log.info("[Polling] Stopped.")

    def _poll(self):
        url = f"{SERVER_URL}/api/printjobs/queue/pending"
        r   = session.get(url, timeout=10)
        if r.status_code == 200:
            jobs = r.json().get("jobs", [])
            for job in jobs:
                if shutdown_flag.is_set():
                    break
                self.processor.process(job)

    def _heartbeat(self):
        def beat():
            while not shutdown_flag.is_set():
                try:
                    session.post(f"{SERVER_URL}/api/printers/agent/heartbeat",
                                 json={"agentId": AGENT_ID, "status": "online"}, timeout=5)
                except Exception as e:
                    log.debug(f"Heartbeat failed: {e}")
                
                # Sleep in small increments
                for _ in range(30):
                    if shutdown_flag.is_set():
                        break
                    time.sleep(1)
        threading.Thread(target=beat, daemon=True).start()


# ─────────────────────────────────────────────────────────────────────
# WebSocket Agent (preferred)
# ─────────────────────────────────────────────────────────────────────
class WebSocketAgent:
    def __init__(self, processor: JobProcessor):
        self.processor   = processor
        self.ws          = None
        self._reconnect_delay = 5

    def run(self):
        log.info(f"[WebSocket] Connecting to {SOCKET_URL}")
        while not shutdown_flag.is_set():
            try:
                self.ws = websocket.WebSocketApp(
                    SOCKET_URL.replace("http", "ws") + "/socket.io/?EIO=4&transport=websocket",
                    on_open=self._on_open,
                    on_message=self._on_message,
                    on_error=self._on_error,
                    on_close=self._on_close,
                    header={"X-Agent-Secret": AGENT_SECRET},
                )
                
                # We need a way to break ws.run_forever if shutdown occurs.
                # We'll run it, but a background thread will monitor the flag and close ws.
                monitor_thread = threading.Thread(target=self._monitor_shutdown, daemon=True)
                monitor_thread.start()
                
                self.ws.run_forever(ping_interval=25, ping_timeout=10)
            except Exception as e:
                log.error(f"[WebSocket] {e}")
                
            if shutdown_flag.is_set():
                break

            log.info(f"[WebSocket] Reconnecting in {self._reconnect_delay}s...")
            for _ in range(self._reconnect_delay):
                if shutdown_flag.is_set():
                    break
                time.sleep(1)
        
        log.info("[WebSocket] Stopped.")

    def _monitor_shutdown(self):
        """Monitors the shutdown flag and forces websocket close."""
        while not shutdown_flag.is_set():
            time.sleep(0.5)
        if self.ws:
            self.ws.close()

    def _on_open(self, ws):
        log.info("[WebSocket] Connected, waiting for Engine.IO handshake...")

    def _on_message(self, ws, message):
        try:
            if message.startswith("0"):
                # Engine.IO open, send Socket.IO connect
                ws.send("40")
                return
            if message.startswith("40"):
                # Socket.IO connected, we can now emit our registration event
                ws.send("42" + json.dumps(["agent:register", {"agentId": AGENT_ID}]))
                return
            if message.startswith("2"):  # Socket.io ping → pong
                ws.send("3")
                return
            # Parse Socket.io event format: 42["event", data]
            if message.startswith("42"):
                payload = json.loads(message[2:])
                event, data = payload[0], payload[1] if len(payload) > 1 else {}
                if event == "job:new":
                    log.info(f"[WS] New job received: {data.get('_id')}")
                    self.processor.process(data)
        except Exception as e:
            log.debug(f"[WS] Message parse error: {e}")

    def _on_error(self, ws, error):
        log.error(f"[WebSocket] Error: {error}")

    def _on_close(self, ws, code, msg):
        log.warning(f"[WebSocket] Closed ({code}): {msg}")


# ─────────────────────────────────────────────────────────────────────
# System Tray Application
# ─────────────────────────────────────────────────────────────────────
def create_image():
    """Generates an in-memory icon for the system tray (a simple blue printer icon)."""
    image = Image.new('RGB', (64, 64), color=(30, 30, 46))
    dc = ImageDraw.Draw(image)
    # Draw a stylized printer shape
    dc.rectangle([16, 24, 48, 48], fill=(99, 102, 241))  # Body
    dc.rectangle([22, 12, 42, 24], fill=(224, 231, 255)) # Paper top
    dc.rectangle([20, 40, 44, 56], fill=(224, 231, 255)) # Paper bottom
    # Screen/button
    dc.rectangle([40, 28, 44, 32], fill=(49, 46, 129))
    # Lines on paper
    dc.line([24, 44, 40, 44], fill=(49, 46, 129), width=2)
    dc.line([24, 48, 36, 48], fill=(49, 46, 129), width=2)
    return image

def on_open_logs(icon, item):
    """Opens the agent.log file."""
    try:
        if sys.platform == "win32":
            os.startfile(_log_file)
        elif sys.platform == "darwin":
            subprocess.call(["open", _log_file])
        else:
            subprocess.call(["xdg-open", _log_file])
    except Exception as e:
        log.error(f"Failed to open logs: {e}")

def on_quit(icon, item):
    """Signals all threads to shut down and stops the tray icon."""
    log.info("Quit requested via System Tray...")
    shutdown_flag.set()
    icon.stop()

def run_system_tray():
    if not PYSTRAY_AVAILABLE:
        log.warning("Running without system tray...")
        try:
            while not shutdown_flag.is_set():
                time.sleep(1)
        except KeyboardInterrupt:
            shutdown_flag.set()
        return

    icon = pystray.Icon("CloudPrintAgent")
    icon.menu = pystray.Menu(
        pystray.MenuItem(f"Status: {PRINTER_NAME or 'Default Printer'}", lambda: None, enabled=False),
        pystray.MenuItem("Open Logs", on_open_logs),
        pystray.MenuItem("Quit", on_quit)
    )
    icon.icon = create_image()
    icon.title = "CloudPrint Agent"
    
    # This call blocks until icon.stop() is called
    icon.run()


# ─────────────────────────────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────────────────────────────
def main():
    log.info("=" * 60)
    log.info("  CloudPrint Local Agent starting...")
    log.info(f"  Server:   {SERVER_URL}")
    log.info(f"  Agent ID: {AGENT_ID}")
    log.info(f"  Printer:  {PRINTER_NAME or 'default'}")
    log.info("=" * 60)

    printer   = PrinterManager(PRINTER_NAME)
    processor = JobProcessor(printer)

    # Start the workers in background threads
    polling = PollingAgent(processor)
    threading.Thread(target=polling.run, daemon=True).start()

    if WEBSOCKET_AVAILABLE:
        ws_agent = WebSocketAgent(processor)
        threading.Thread(target=ws_agent.run, daemon=True).start()
    else:
        log.info("WebSocket unavailable — running in polling-only mode")

    try:
        # Run the system tray icon on the main thread (blocks here)
        run_system_tray()
    except KeyboardInterrupt:
        log.info("Ctrl+C detected, shutting down...")
        shutdown_flag.set()

    # Wait briefly for threads to close out
    log.info("Waiting for background tasks to clean up...")
    time.sleep(1)
    log.info("Agent shut down successfully.")

if __name__ == "__main__":
    main()
