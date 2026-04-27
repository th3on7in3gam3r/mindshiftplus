<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MindShift AI Scribe V3.5

A professional, mobile-responsive AI-powered clinical scribe application designed for psychiatric and behavioral health documentation. Built with React, TypeScript, and Google's Gemini AI.

## Clinical Workflow

### 1. **Authentication**
Secure HIPAA-compliant login for healthcare providers

### 2. **During the Visit**
- **Real-time Recording**: Capture every detail with our best-in-class scribe
- **Live Transcription**: AI learns your documentation style
- **Session Management**: Track duration and patient context

### 3. **After the Visit**
- **AI Documentation**: Generate codes, letters, and patient instructions
- **EHR Integration**: Push directly to your EHR system
- **Review & Edit**: Full control over generated documentation

## Features

- **AI-Powered Clinical Documentation** - Transform session transcripts into comprehensive, billing-ready progress notes
- **Mobile-First Responsive Design** - Fully functional on phones, tablets, and desktops
- **MindShift+ Lavender Theme** - Professional healthcare interface with 5 color themes
- **ICD-10 Code Management** - Quick search and selection of psychiatric diagnosis codes
- **Real-time Recording** - Capture sessions with live transcription
- **EHR Integration Ready** - Push notes directly to your EHR system
- **Note Archive** - Save and retrieve previous session notes
- **HIPAA-Conscious Design** - Privacy-focused interface and workflows

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

## Mobile Usage

The app is fully responsive:
- **Mobile**: Collapsible sidebars with hamburger menu
- **Tablet**: Overlay sidebars with smooth transitions
- **Desktop**: Full three-column layout

## Tech Stack

- React 19 + TypeScript
- Vite for fast development
- Tailwind CSS 4 for styling
- Google Gemini AI for clinical note generation
- Framer Motion for animations
- Express backend for API proxy

## View in AI Studio

https://ai.studio/apps/73214e40-7ccc-4a60-849f-d22cbc5e8d4f
