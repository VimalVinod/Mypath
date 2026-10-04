# Original User Request

## Initial Request — 2026-09-13T16:45:21Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Build a PDF Parsing and Validation Pipeline
> Requested team: [none — teamwork routes from the description]

Build a standalone Node.js backend pipeline that parses PDF files, extracts specific pages/sentences based on keyword matching, and uses the Gemini API to cross-reference (unity check) the extracted data against database criteria.

Working directory: `c:\Users\sindh\Documents\codes\mypath-scraper`
Integrity mode: development

## Requirements

### R1. Targeted PDF Parsing
Create a utility that reads a PDF file but does not just dump the entire text. It must be able to search the PDF for specific keywords and extract only the relevant pages or sentences containing those keywords to minimize token usage and noise.

### R2. Gemini API Integration
Integrate the official `@google/genai` SDK. Pass the targeted, extracted PDF text to the Gemini model to intelligently parse out structured criteria (e.g., eligibility requirements, qualifications, or specific data points). 

### R3. Unity / Database Checking
Implement a verification module ("unity checking") that compares the structured data returned by Gemini against a predefined set of database criteria or schema rules. Ensure the logic can evaluate if the parsed PDF matches the required criteria.

### R4. Standalone Execution
This must be a standalone pipeline. **Do NOT include** Firestore database interactions, user creation, or email sending integrations (Resend). Provide a local test script (e.g., `parse-demo.js`) that allows the user to supply a PDF, a Gemini API key via `.env`, and mock database criteria to see the end-to-end extraction and validation in the console.

## Acceptance Criteria

### Parsing Verification
- [ ] The script successfully reads a sample PDF and extracts only the text from pages or sentences containing specified keywords.

### Extraction & Validation Verification
- [ ] The script successfully sends the targeted text to the Gemini API and receives a structured response.
- [ ] The script runs a "unity check" function that correctly validates the Gemini output against mock database criteria and logs the match/mismatch result.
- [ ] The pipeline runs entirely locally via a command like `node parse-demo.js` without relying on active Firebase connections or email services.
