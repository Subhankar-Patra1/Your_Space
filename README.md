# Your Space

<div align="center">

<img src="client/public/favicon.svg" alt="Your Space Logo" width="120" />

### A Minimalist, Real-Time Collaborative Writing Environment.

[Demo](https://yourspace-web.vercel.app) · [Report Bug](https://github.com/Subhankar-Patra1/Your_Space/issues) · [Request Feature](https://github.com/Subhankar-Patra1/Your_Space/issues)

</div>

---

## ✨ Overview

**Your Space** is a distraction-free text editor designed for speed and simplicity. It features real-time collaboration, a clean "Notion-style" interface, and powerful Markdown support. Built with performance and aesthetics in mind, it allows you to just start writing.

## 🚀 Key Features

*   **Real-Time Collaboration**: Edit documents with friends instantly (Socket.io).
*   **Minimalist Design**: A clean, monochromatic interface that focuses on your content.
*   **Full Markdown Support**: Write in Markdown and preview safely with strict sanitization.
*   **Slash Commands**: Type `/` to access headings, lists, code blocks, and more.
*   **Live Presence**: See who is online and where their cursor is.
*   **Smart Auto-Saving**: Never lose your work; changes are saved automatically.
*   **Image Support**: Drag and drop images directly into your document.
*   **Dark Mode**: A carefully crafted dark theme for late-night writing.

## 🛠️ Tech Stack

*   **Frontend**: React (Vite), Tailwind CSS
*   **Backend**: Node.js, Express, Socket.io
*   **Database**: PostgreSQL (via Neon & Prisma)
*   **Deployment**: Vercel (Frontend), Render (Backend)

## 📦 Getting Started

### Prerequisites

*   Node.js (v18+)
*   PostgreSQL Database (Neon recommended)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Subhankar-Patra1/Your_Space.git
    cd Your_Space
    ```

2.  **Setup Backend**
    ```bash
    cd server
    npm install
    cp .env.example .env  # Add your DATABASE_URL here
    npx prisma db push
    npm run dev
    ```

3.  **Setup Frontend**
    ```bash
    cd client
    npm install
    npm run dev
    ```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ by Subhankar Patra</sub>
</div>
