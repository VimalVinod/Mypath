# MyPath - Government Exam Discovery & Eligibility Verification

Welcome to the **MyPath** project repository! This project is an AI-powered platform designed to automate the discovery of government exams and verify candidate eligibility using targeted PDF parsing, Google Gemini AI, and deterministic neuro-symbolic "unity checking".

## 📁 Repository Structure

To make navigation easy and uniform, the folder structure has been organized as follows:

- **`frontend/`**
  - Contains the responsive web interface.
  - Built with a focus on CSS media queries to ensure 100% desktop DOM integrity while providing a seamless mobile experience.

- **`backend/`**
  - Contains the Node.js API layer.
  - Handles unstructured PDF ingestion, heuristic keyword filtering (reducing LLM payloads by ~92%), and communicates with the Gemini API for JSON schema extraction.
  - Implements the Unity Checking module to compare user profiles against the extracted exam criteria.

- **`research_paper/`**
  - Contains the IEEE-formatted academic paper documenting the MyPath architecture.
  - `MyPath_Paper.pdf`: The finalized 4-page PDF with layout, tables, and architectural TikZ diagrams.
  - `MyPath_Paper.tex`: The LaTeX source code for the paper.

- **`global_resources/`**
  - Centralized location for shared configuration and credentials.
  - Includes `firebase-service-account.json`.

- **`project_diary/`**
  - Contains project management and tracking documents.
  - Includes schedules, weekly updates (`Week1...txt`), diary templates, and relevant screenshots/images.

- **`.agents/`**
  - Configuration and workflow files used by the AI agents assisting with this project.

## 📄 Root Documents

- **`ORIGINAL_REQUEST.md`**: The initial prompt and core technical requirements that initiated the project.
- **`TEST_READY.md`**: Testing documentation and status reports for the system's components.

## 🚀 Quick Start

1. Ensure you have Node.js installed.
2. Setup your Gemini API keys and Firebase credentials (refer to `global_resources`).
3. Navigate to the `backend/` and `frontend/` directories to install dependencies (`npm install`) and run the respective local servers.
