<div align="center">

# 💊 Pill

### The Intelligent Voice-First Desktop Command Center

[Overview](#-what-is-pill) • [Features](#-core-capabilities) • [Installation](#-quick-start) • [Usage](#-hotkeys--usage) • [Docs](docs/)

---

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/built%20with-Tauri-blue)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/powered%20by-Rust-orange)](https://www.rust-lang.org/)

</div>

<p align="center">
  <img src="C:/Users/allro/.gemini/antigravity/brain/70ca2ce9-43d4-470c-9031-0ba25a7538f0/pill_header_mockup_1769880249832.png" alt="Pill App Mockup" width="600">
</p>

## ✨ What is Pill?

**Pill** is a modern, high-performance desktop companion built with Tauri and Rust. It transforms your desktop into a voice-first command center, allowing you to launch apps, control your system, and interact with AI—all through seamless voice commands or a lightning-fast command palette.

## 🚀 Core Capabilities

- 🗣️ **Voice-First Interaction**: Triggered by high-accuracy wake words (e.g., "Jarvis").
- ⚡ **Instant Palette**: A premium, blurred Command Palette for quick keyboard navigation.
- 🎹 **App Management**: Search, launch, and manage applications with sub-second latency.
- 🔊 **Neural TTS**: Integrated Kokoro TTS for natural, high-quality voice responses.
- 🛠️ **MCP Integration**: Extend functionality with the Model Context Protocol (MCP).
- 🎮 **Game Profiles**: Specialized features for gaming, including cheat management and process control.

## 🌈 Why Pill?

- ⚡ **Built for Power Users**: Keyboard-centric design with sub-second latency for all operations.
- 🗣️ **NLP + Automation**: Intelligent intent recognition that goes beyond keyword matching.
- 🔌 **Plugin-Ready**: Modular architecture designed for custom community extensions.
- 🛡️ **Privacy First**: Optimized for local inference to keep your data on your machine.
- 💻 **Cross-Platform**: A premium, consistent experience on Windows, macOS, and Linux.

## 🛠️ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (latest stable)
- [Tauri Dependencies](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation

```bash
# Clone the repository
git clone https://github.com/Allrounder687/Pill.git

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

## ⌨️ Hotkeys & Usage

| Action                   | Hotkey                       |
| :----------------------- | :--------------------------- |
| Toggle Command Palette   | `Alt + Space`                |
| Activate Voice Listening | `Wake Word (e.g., "Jarvis")` |
| Quick Search             | Start typing in Palette      |
| Close/Cancel             | `Esc`                        |

## 🗺️ Roadmap

- [x] ✔️ **Core Engine**: High-performance Tauri/Rust foundation.
- [x] ✔️ **Instant Palette**: Premium glassmorphic Command Palette.
- [/] 🔜 **Neural Voice**: Integration of Kokoro TTS (In Progress).
- [ ] 🔜 **Custom Wake Words**: Train and use your own wake words.
- [ ] ❓ **Offline LLM**: Local inference for complete privacy (Research).
- [ ] ❓ **Plugin System**: Community-driven extensions (Planned).

## 📚 Documentation

Detailed documentation can be found in the [docs/](docs/) folder:

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Voice System Analysis](docs/VOICE_ANALYSIS.md)
- [Wake Word Implementation](docs/WAKE_WORD_IMPLEMENTATION.md)
- [TTS Implementation (Kokoro)](docs/KOKORO_IMPLEMENTATION.md)

---

<div align="center">
Built with ❤️ by the Pill Community.
</div>
