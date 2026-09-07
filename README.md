# MyPath - Smart Government Exam Discovery & Tracking Platform

This repository is structured cleanly into dedicated folders for project evaluation and development.

## Directory Structure

```
mypath/
├── codes/                             # Complete Application Codebase
│   ├── src/                           # React + TypeScript source code
│   │   ├── assets/                    # Active web assets (banners, logos, icons)
│   │   ├── components/                # Modular UI components
│   │   ├── context/                   # Global state management
│   │   ├── data/                      # Exam catalogs & assessment quiz data
│   │   ├── pages/                     # Full-page application views
│   │   ├── styles/                    # Global design tokens and theme styling
│   │   └── types/                     # TypeScript type definitions
│   ├── public/                        # Static public web assets
│   ├── firebase.json                  # Firebase configuration
│   ├── firestore.rules                # Database security rules
│   ├── package.json                   # Web application dependencies & scripts
│   ├── tsconfig.json                  # TypeScript compiler options
│   └── vite.config.ts                 # Vite bundler configuration
│
├── resources/                         # Project Presentation & Evaluation Resources
│   ├── MyPath_SRS.docx                # Official Software Requirements Specification (SRS)
│   ├── PROJECT_CONTEXT.md             # System Architecture & College Project Overview
│   ├── banners/                       # Current active high-resolution promotional banners
│   │   ├── banner-one.png             # Hero Banner 1: MacBook Pro Studio Mockup
│   │   ├── banner-two.png             # Hero Banner 2: AI Eligibility Engine (Minimal Dark)
│   │   └── banner-three.png           # Hero Banner 3: Gazette & Real-Time Deadline Tracker
│   ├── branding/                      # Official brand logos, wordmarks, and favicons
│   └── scripts/                       # Python scripts used to generate the active banners
│
└── package.json                       # Root script forwarder (enables npm run dev from root)
```

## Running the Web Application

You can start the development server from either:
1. **Root directory (`mypath/`)**:
   ```bash
   npm run dev
   ```
2. **Codes directory (`mypath/codes/`)**:
   ```bash
   cd codes
   npm run dev
   ```

To build for production:
```bash
npm run build
```
