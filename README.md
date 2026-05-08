# ⚡ Marauder UI Pro

![Pwnterrey Logo](Pwnterrey-1024x1010.png)

A professional, high-performance web dashboard for the [ESP32 Marauder](https://github.com/justcallmekoko/ESP32Marauder) firmware. Specifically optimized for the **Badge Pwnterrey 2026** and the ESP32-C5 architecture.

🌐 **[Live Demo](https://ElectronicCats.github.io/marauder-ui-pro/)**

---

## 💎 Pro Features

Beyond basic scanning, the **Pro** version introduces advanced tactical workflows:

### 📍 GPS & Tactical Mapping
- **Live Map Visualization**: Integrated OpenStreetMap to track wardriving progress in real-time.
- **Satellite Telemetry**: Monitor signal quality, constellation count (GPS/GLONASS/GALILEO), and precise coordinates.
- **Geofencing (Lost Mode)**: Set a safety perimeter. Visual and logic alerts if the device is moved outside the allowed zone.

### 📁 Advanced Storage Manager
- **File Browser**: Full access to SPIFFS and SD Card filesystems.
- **Binary Downloads**: Optimized transfer to download `.pcap`, `.log`, and `.json` files directly to your browser for analysis in Wireshark.
- **System Stats**: Monitor memory usage and storage health in real-time.

### 🎣 Evil Portal Orchestrator
- **Phishing Workflows**: Select from pre-loaded portals (Google, Starbucks, etc.) and deploy with one click.
- **Live Logs**: Watch captured credentials and connected clients as they interact with the portal.

### 🏷️ NFC & Social Engineering
- **NFC Toolset**: Interface to read and write NDEF tags.
- **Social Link Write**: Quickly program tags with social media profiles or malicious URLs.
- **Portal Sync**: Automatically write the Evil Portal URL to the badge's NFC chip for seamless "Tap-to-Join" attacks.

### 🍎 Optimized BLE Attacks
- **Sour Apple & Fast Pair**: Specialized timing for the ESP32-C5 single-core architecture.
- **Smart Spamming**: Categorized attacks for iOS, Android, and Windows devices.

---

## 🎨 Design Philosophy: Neobrutalism
Built with a "Cyber-Tactical" aesthetic using **Vue 3** and **Tailwind CSS**. The interface prioritizes high contrast, responsiveness, and minimal latency for field operations.

---

## 🛠️ Requirements
- **Hardware**: ESP32-C5 / ESP32-S3 / ESP32 (Recommended: Badge Pwnterrey 2026).
- **Browser**: Chrome or Edge (Web Serial API support is mandatory).
- **Firmware**: Marauder Firmware (v1.0.0+ for Pro features).

---

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Launch Dashboard**:
   ```bash
   npm run dev
   ```
3. **Connect**:
   Open the local URL, click **Connect**, and select your device's COM port.

---

## ⌨️ Tactical Workflows (Macros)
The Pro UI includes a "Workflow" list that automates complex command sequences:
- **"Start Wardrive"**: Configures GPS, checks signal, and starts `btwardrive` with one tap.
- **"Evil Portal Deploy"**: Sets the SSID, selects the portal, and starts the sniffing engine.
- **"Lost Mode"**: Arms the geofence and starts periodic GPS reporting.

---

## 🤝 Credits & Ecosystem
- **Hardware & Support**: [Electronic Cats](https://electroniccats.com) 😼
- **Original Firmware**: [justcallmekoko](https://github.com/justcallmekoko)
- **UI Maintenance**: [michelangelomo](https://github.com/michelangelomo) & [Mikystars](https://github.com/Mikystars)

---
*Developed for the Offensive Security community.* 💀
