"""
SafeguardsIQ Edge — Cloud Sync Module
=======================================
Optional background service that syncs violations to the SafeguardsIQ
cloud dashboard when internet is available. Works completely offline
when disconnected — queues everything and syncs on reconnection.
"""

import time
import json
import threading
import requests
from datetime import datetime

from database import (
    get_config, set_config, get_unsynced_violations,
    mark_synced, get_factory_info, get_today_stats,
)
from engine import get_all_live_frames


class CloudSync:
    def __init__(self):
        self.running = False
        self.thread = None
        self.last_sync = None
        self.last_error = None
        self.synced_count = 0
        self.failed_count = 0

    def is_enabled(self):
        return get_config("cloud_sync_enabled", "false") == "true"

    def get_status(self):
        return {
            "enabled": self.is_enabled(),
            "running": self.running,
            "last_sync": self.last_sync,
            "last_error": self.last_error,
            "synced_total": self.synced_count,
            "failed_total": self.failed_count,
        }

    def start(self):
        if self.running:
            return
        if not self.is_enabled():
            print("[cloud-sync] Disabled — enable in Settings to sync to cloud")
            return

        self.running = True
        self.thread = threading.Thread(target=self._sync_loop, daemon=True, name="cloud-sync")
        self.thread.start()
        print("[cloud-sync] Started — syncing violations to cloud")

    def stop(self):
        self.running = False
        print("[cloud-sync] Stopped")

    def _sync_loop(self):
        """Background loop: sync unsynced violations every 30 seconds."""
        while self.running:
            if not self.is_enabled():
                time.sleep(30)
                continue

            cloud_url = get_config("cloud_url", "")
            cloud_token = get_config("cloud_token", "")

            if not cloud_url or not cloud_token:
                time.sleep(60)
                continue

            try:
                # 1. Sync violations
                unsynced = get_unsynced_violations(limit=20)
                if unsynced:
                    synced_ids = []
                    for v in unsynced:
                        try:
                            r = requests.post(
                                f"{cloud_url}/violations",
                                json={
                                    "camLabel": v["cam_label"],
                                    "violationType": v["violation_type"],
                                    "severity": v["severity"],
                                    "confidence": v["confidence"],
                                    "description": v["description"],
                                    "frameBase64": "",  # don't send frames to save bandwidth
                                },
                                headers={
                                    "Authorization": f"Bearer {cloud_token}",
                                    "Content-Type": "application/json",
                                },
                                timeout=10,
                            )
                            if r.status_code in (200, 201):
                                synced_ids.append(v["id"])
                                self.synced_count += 1
                            else:
                                self.failed_count += 1
                        except requests.exceptions.ConnectionError:
                            break  # offline — stop trying
                        except:
                            self.failed_count += 1

                    if synced_ids:
                        mark_synced(synced_ids)
                        self.last_sync = datetime.utcnow().isoformat()
                        print(f"[cloud-sync] Synced {len(synced_ids)} violations")

                # 2. Send heartbeat with stats
                try:
                    stats = get_today_stats()
                    requests.post(
                        f"{cloud_url}/edge/heartbeat",
                        json={
                            "factory": get_factory_info().get("factory_name", ""),
                            "cameras_online": stats.get("cameras_online", 0),
                            "violations_today": stats.get("violations_today", 0),
                            "compliance_rate": stats.get("compliance_rate", 100),
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                        headers={
                            "Authorization": f"Bearer {cloud_token}",
                            "Content-Type": "application/json",
                        },
                        timeout=5,
                    )
                except:
                    pass  # heartbeat is non-critical

                self.last_error = None

            except Exception as e:
                self.last_error = str(e)

            time.sleep(30)  # sync every 30 seconds


# Singleton instance
cloud_sync = CloudSync()
