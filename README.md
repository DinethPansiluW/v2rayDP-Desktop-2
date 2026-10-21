# v2rayDP Desktop

**v2rayDP Desktop** is a modern, high-performance Windows desktop client for **VLESS** and **VMess** protocols, converted from the original Android app `v2rayDP` by **DinethPansiluW**.

Powered by **sing-box** (GPLv3) and **Wintun** (MIT/GPLv2) with **React + TypeScript + Tailwind CSS** frontend, **Electron** runtime, and **electron-builder** packaging (NSIS installer and standalone portable `.exe`).

Unlike standard proxy clients, v2rayDP Desktop operates like NetMod: a true full-device VPN using a virtual network adapter (TUN). When you press Connect, **ALL traffic of ALL applications** (browsers, terminals, background services, games, curl, etc.) routes through the encrypted proxy tunnel with zero proxy settings needed.

---

## 🚀 Key Features

1. **Full-Device VPN (TUN Virtual Network Adapter)**:
   - Uses the official `sing-box` binary with `Wintun` Layer 3 driver.
   - Creates a dedicated virtual network adapter (`v2raydp-tun`) on `172.19.0.1/30` and IPv6 `fdfe:dcba:9876::1/126`.
   - `auto_route: true`, `strict_route: true`, and `auto_detect_interface: true` ensure complete full-system capture with zero routing loops.
   - Absolutely no Windows registry manipulation or proxy overrides.

2. **Protocols & Transports**:
   - **VLESS**: Supports XTLS-Vision (`xtls-rprx-vision`), VLESS-Reality (`pbk`, `sid`, `fp`, `spx`), TLS, and plain.
   - **VMess**: Supports standard Base64 JSON and URI formats (`alterId`, `auto`, `security`).
   - **Transports**: TCP, WebSocket (`ws`), gRPC, HTTP/2 (`h2`), and `httpupgrade`.
   - **TLS & Certificate Handling**: `insecure: true` always enabled for maximum connectivity and self-signed certificate compatibility; reality settings and utls fingerprints fully preserved.

3. **Automated Zero-Touch Binary Provisioning**:
   - Automated script (`scripts/fetch-binaries.mjs`) downloads and extracts official Windows AMD64 `sing-box.exe` and `wintun.dll` into `resources/bin/`.
   - Versions pinned in `scripts/versions.json` (`singBox: 1.13.14`, `wintun: 0.14.1`).
   - Zero manual binary downloading or copying required.

4. **Wi-Fi Network Automation**:
   - Automatically polls `netsh wlan show interfaces` (every 4 seconds).
   - Auto-connect when joining Wi-Fi: "Any SSID" or a list of specific approved SSIDs with target profile assignment.
   - Disconnect policies: "Stop VPN" (tears down TUN adapter) or "Keep VPN running".
   - Auto-stop when Wi-Fi radio is turned off.
   - Auto-reconnect when returning to approved SSID.
   - Network-scoped manual override: if you disconnect manually, the app does not auto-reconnect on that same network until the network changes.

5. **Elevated Windows Startup (Task Scheduler)**:
   - Registers an elevated task in Windows Task Scheduler (`schtasks /Create /TN "v2rayDP Desktop" /TR "\"<exe path>\" --minimized" /SC ONLOGON /RL HIGHEST /F`).
   - Bypasses UAC prompts on Windows startup.
   - Synchronized across Settings and Automation tabs.

6. **Hotspot & LAN Sharing**:
   - Host PC remains 100% full-device tunnelled by the TUN virtual adapter.
   - Optional extra `mixed` (SOCKS+HTTP) inbound on `0.0.0.0:[port]` when sharing is toggled ON.
   - Displays all local IPv4 interface addresses with 1-click copy buttons.
   - Real elevated Windows Defender Firewall rules (add and remove).
   - Devices on the hotspot connect by setting the host's IP:port as their proxy.

7. **Ad & Threat Blocking (sing-box Rule-Sets)**:
   - Real blocklist downloads and parsing (AdAway, EasyPrivacy, Phishing Filter).
   - Compiles local `rule-set` source JSON file (`adblock.json`) into `adblock.srs` via `sing-box rule-set compile` (or falls back to source format).
   - Rejected connections are intercepted directly in the sing-box routing table (`action: "reject"`).
   - Real domain counts, deduplicated, zero fake metrics (`lastUpdated` null until first update).

8. **Accurate Real-Time Traffic Metrics**:
   - Connects to internal loopback `clash_api` (`/connections`) every second.
   - Live upload and download speeds derived from exact delta bytes.
   - Total session TX/RX bytes and connected uptime.

---

## 🏗️ Build exe

To build the standalone Windows executable and installer:

1. Open PowerShell as Administrator
2. `npm install`
3. `npm run dist`
4. Find the exe in `release/`

Output files created in `release/`:
- **NSIS Setup Installer**: `release/v2rayDP-Desktop-Setup-1.0.0.exe`
- **Standalone Portable `.exe`**: `release/v2rayDP-Desktop-Portable-1.0.0.exe`

---

## 📁 Project Structure

```
├── electron/
│   ├── main.ts              # Electron main process (sing-box spawn, Wintun TUN, Task Scheduler, Tray)
│   └── preload.ts           # Context bridge exposing secure window.api
├── resources/
│   ├── bin/
│   │   ├── sing-box.exe     # Official sing-box executable
│   │   ├── wintun.dll       # Wintun Layer-3 TUN driver
│   │   └── .versions        # Pinned version verification marker
│   └── blocklist_sources.json
├── scripts/
│   ├── versions.json        # Pinned engine versions (sing-box, Wintun)
│   └── fetch-binaries.mjs   # Automated binary downloader and extractor
├── src/
│   ├── assets/              # Logo and bundled blocklist sources
│   ├── components/
│   │   ├── TopBar.tsx       # Horizontal top navigation bar
│   │   ├── EditProfileModal.tsx # Full VLESS/VMess manual add & edit dialog
│   │   ├── QrCodeModal.tsx  # QR code generator and share link dialog
│   │   └── SingBoxConfigModal.tsx # sing-box JSON configuration inspector
│   ├── core/
│   │   ├── types.ts         # Shared TypeScript interfaces & types
│   │   ├── VmessLinkParser.ts # VLESS/VMess link parser & sing-box config generator
│   │   ├── AutomationDecision.ts # Pure functional Wi-Fi automation engine
│   │   ├── BlockManager.ts  # Ad-block download, merge & rule normalizer
│   │   ├── SocialLinks.ts   # Original developer social links
│   │   └── mockApi.ts       # Full browser mock API for AI Studio preview
│   ├── screens/
│   │   ├── DashboardScreen.tsx  # Main dashboard with big connect button & traffic
│   │   ├── AutomationScreen.tsx # Wi-Fi automation and rules
│   │   ├── HotspotScreen.tsx    # LAN/Hotspot proxy sharing
│   │   ├── BlockingScreen.tsx   # Ad & malware reject filters
│   │   ├── SettingsScreen.tsx   # DNS, bypass LAN, tray options, reset
│   │   └── AboutScreen.tsx      # App info, licenses (GPLv3, Wintun), credits
│   ├── App.tsx              # Main application shell and state controller
│   └── main.tsx             # React entry point
├── tests/
│   ├── VmessLinkParser.test.ts   # Unit tests for sing-box config generation
│   └── AutomationDecision.test.ts # Unit tests for pure automation decisions
├── electron-builder.yml     # NSIS installer and portable executable configuration (requireAdministrator)
├── package.json             # Scripts: dev, build, dist, test, postinstall
└── tsconfig.electron.json   # TypeScript config for Electron scripts
```

---

## 🧪 Manual Test Checklist

| # | Test Area | Action | Expected Result |
|---|---|---|---|
| 1 | **Full-Device VPN (Browser)** | Connect to any active node and check public IP at `https://ipinfo.io` in Chrome/Edge/Firefox. | Shows the proxy server's public IP and location. |
| 2 | **Full-Device VPN (Terminal / Non-Browser)** | In PowerShell or CMD, run `curl https://api.ipify.org` or `ssh` / `git clone`. | All traffic routes through TUN adapter; returns proxy IP. |
| 3 | **Node Quick-Switch** | Select another node from the dashboard dropdown while connected. | Immediately switches sing-box process to the new node with zero traffic interruption. |
| 4 | **Disconnect & Adapter Cleanup** | Click Disconnect (or Exit from tray). | TUN adapter and routes disappear automatically; normal internet connection restored. |
| 5 | **Crash / Process Kill Recovery** | Kill app from Task Manager while connected. Relaunch app. | Startup self-clean runs `taskkill /F /IM sing-box.exe`; stale adapter is cleared. |
| 6 | **Wi-Fi Automation (SSID Rules)** | Connect to an approved SSID defined in Automation rules. | Automatically starts VPN tunnel with the designated profile. |
| 7 | **Wi-Fi Automation (Leave Policy)** | Disconnect from Wi-Fi. | Tunnel stops automatically if `STOP_VPN` is selected. |
| 8 | **Startup Task (Task Scheduler)** | Toggle "Start with Windows" ON in Settings, inspect `schtasks /Query /TN "v2rayDP Desktop"`. | Elevated Task Scheduler entry exists with highest runlevel; deleting removes task. |
| 9 | **Hotspot Sharing from Phone** | Enable Hotspot sharing toggle, configure phone's Wi-Fi proxy to PC's IP and configured port. | Phone successfully browses internet through the host's tunnel. |
| 10 | **Windows Firewall Rule** | Click "Add Firewall Rule", then "Remove Rule". | Elevated netsh adds and removes rule for the configured port with real status result. |
| 11 | **Ad Blocking Update** | Click "Update Lists" on Ad Blocking page. | Downloads real hosts/domains, parses and deduplicates, updates local rule-set, shows real count. |
| 12 | **Packaging Verification** | Run `npm run dist` on Windows. | Successfully compiles and outputs portable `.exe` and NSIS installer in `release/`. |

---

## ⚖️ Open-Source Licenses & Credits
- **v2rayDP Android Architecture**: Designed by [DinethPansiluW](https://github.com/DinethPansiluW)
- **sing-box**: [SagerNet/sing-box](https://github.com/SagerNet/sing-box) — Licensed under the **GNU General Public License v3.0 (GPLv3)**.
- **Wintun**: [Wintun](https://www.wintun.net/) — Copyright © 2018-2021 WireGuard LLC. Licensed under MIT / GPLv2 terms.
