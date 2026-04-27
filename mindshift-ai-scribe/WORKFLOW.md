# MindShift AI Scribe - Clinical Workflow

## Application Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         1. AUTHENTICATION                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │              🔐 Secure Provider Login                   │    │
│  │                                                         │    │
│  │         Email: provider@mindshift.health               │    │
│  │         Password: ••••••••                             │    │
│  │                                                         │    │
│  │              [Sign In to Continue]                      │    │
│  │                                                         │    │
│  │         HIPAA-compliant authentication                  │    │
│  │                                                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      2. SESSION SETUP                            │
│                     (Before the Visit)                           │
│                                                                  │
│  ┌──────────────┐  ┌────────────────────────┐  ┌─────────────┐ │
│  │   Sidebar    │  │   Configuration Form   │  │   Archive   │ │
│  │              │  │                        │  │             │ │
│  │  MindShift   │  │  Patient ID *          │  │  Previous   │ │
│  │  AI Scribe   │  │  Date of Service       │  │  Sessions   │ │
│  │              │  │  Provider Name *       │  │             │ │
│  │  [Themes]    │  │  Session Type          │  │  • Note 1   │ │
│  │   ○ ○ ○ ○    │  │  Modality              │  │  • Note 2   │ │
│  │              │  │                        │  │  • Note 3   │ │
│  │              │  │  Patient History       │  │             │ │
│  │              │  │  ICD-10 Codes          │  │             │ │
│  │              │  │                        │  │             │ │
│  │              │  │  [Start Visit →]       │  │             │ │
│  └──────────────┘  └────────────────────────┘  └─────────────┘ │
│                              ↓                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      3. DURING VISIT                             │
│              (Capture every detail - AI learns)                  │
│                                                                  │
│                    ┌─────────────────────┐                      │
│                    │   Active Session    │                      │
│                    │  Patient: PT-12345  │                      │
│                    │  Duration: 00:15:32 │                      │
│                    └─────────────────────┘                      │
│                                                                  │
│                    ┌─────────────────────┐                      │
│                    │    🔴 RECORDING     │                      │
│                    └─────────────────────┘                      │
│                                                                  │
│                      ┌─────┐  ┌─────┐                          │
│                      │  ⏸  │  │  ⏹  │                          │
│                      │Pause│  │Stop │                          │
│                      └─────┘  └─────┘                          │
│                                                                  │
│              Recording in progress. Speak naturally -           │
│              the AI is capturing every detail.                  │
│                                                                  │
│                    ┌─────────────────────┐                      │
│                    │  Live Transcript    │                      │
│                    │─────────────────────│                      │
│                    │ Patient reports     │                      │
│                    │ feeling anxious...  │                      │
│                    │ Sleep disrupted...  │                      │
│                    │ Appetite decreased..│                      │
│                    └─────────────────────┘                      │
│                                                                  │
│              [Complete Visit & Generate Documentation]          │
│                              ↓                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      4. AFTER VISIT                              │
│        (Generate codes, letters, push to EHR)                    │
│                                                                  │
│  ┌──────────────┐  ┌────────────────────────┐  ┌─────────────┐ │
│  │   Sidebar    │  │   Generated Note       │  │   Archive   │ │
│  │              │  │                        │  │             │ │
│  │  MindShift   │  │  ⚡ Generating...      │  │  Saved      │ │
│  │  AI Scribe   │  │                        │  │  Notes      │ │
│  │              │  │  Analyzing transcript, │  │             │ │
│  │              │  │  mapping ICD-10 codes, │  │             │ │
│  │              │  │  generating progress   │  │             │ │
│  │              │  │  note...               │  │             │ │
│  │              │  │                        │  │             │ │
│  │              │  │  ↓                     │  │             │ │
│  │              │  │                        │  │             │ │
│  │              │  │  📄 Clinical Note      │  │             │ │
│  │              │  │  ─────────────────     │  │             │ │
│  │              │  │  Patient ID: PT-12345  │  │             │ │
│  │              │  │  Date: 2026-04-27      │  │             │ │
│  │              │  │                        │  │             │ │
│  │              │  │  Subjective: ...       │  │             │ │
│  │              │  │  Objective: ...        │  │             │ │
│  │              │  │  Assessment: ...       │  │             │ │
│  │              │  │  Plan: ...             │  │             │ │
│  │              │  │                        │  │             │ │
│  │              │  │  [Copy] [Download]     │  │             │ │
│  │              │  │  [Push to EHR →]       │  │             │ │
│  │              │  │                        │  │             │ │
│  │              │  │  [Start New Session]   │  │             │ │
│  └──────────────┘  └────────────────────────┘  └─────────────┘ │
│                              ↓                                   │
│                    (Loop back to Setup)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features by Stage

### 1. Authentication
- ✅ Secure login
- ✅ HIPAA messaging
- ✅ Provider identification
- ✅ Demo mode enabled

### 2. Session Setup
- ✅ Patient information
- ✅ Session configuration
- ✅ ICD-10 code selection
- ✅ Clinical context input
- ✅ Access to note archive

### 3. During Visit
- ✅ Real-time recording
- ✅ Live transcription
- ✅ Session timer
- ✅ Pause/resume controls
- ✅ Full-screen focus mode
- ✅ AI learning messaging

### 4. After Visit
- ✅ Automatic AI generation
- ✅ Progress note display
- ✅ Copy/download options
- ✅ EHR sync integration
- ✅ Start new session
- ✅ Note archiving

## Mobile Experience

All screens are fully responsive:
- **Portrait**: Optimized vertical layouts
- **Landscape**: Adapted horizontal layouts
- **Touch**: Large, accessible controls
- **Gestures**: Swipe-friendly sidebars

## State Management

```javascript
type AppState = 'auth' | 'setup' | 'during' | 'after';

// State transitions:
auth → setup → during → after → setup (loop)
```

## Data Flow

```
User Login
    ↓
Session Data Created
    ↓
Recording Captures Transcript
    ↓
AI Generates Documentation
    ↓
Note Saved to Archive
    ↓
Optional: Sync to EHR
```
