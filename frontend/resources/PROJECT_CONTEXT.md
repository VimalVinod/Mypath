# MyPath - Project Context & Architecture

**Project Type:** College Project
**Core Concept:** An automated exam tracking and eligibility matching system for competitive government exams (like PSC, UPSC, SSC).

## Architecture & Workflow

1. **Frontend & Dashboard:**
   - Tech: React (Vite)
   - Functionality: Users register, create a profile, and access a personalized dashboard to track exams.

2. **Backend Scraping Engine:**
   - Runs on a scheduled interval (every 15-30 minutes).
   - Scrapes announcements, PDFs, and images from 3 to 4 specific government exam portals.

3. **Data Extraction & AI Processing:**
   - PDFs/Images are converted into raw text.
   - The raw, unstructured data is bundled into a JSON file and sent to an AI API (like Gemini) with a specific prompt.
   - The AI formats this scrambled data into clean, structured exam details.

4. **Matching & Notification Engine:**
   - The structured exam data is sent to the database (Firebase).
   - A cross-referencing program checks the new exam requirements against the qualifications of registered users.
   - If a user is eligible, they receive an automated, friendly notification (e.g., "Hey, you are qualified for this exam!").

5. **Study Material Finder:**
   - A separate program searches the internet for relevant study materials and provides links on the platform, properly crediting the original owners.

6. **Career Assessment Test:**
   - A psychological/interest-based quiz for users who are unsure about their career path.
   - Based on their answers, the system suggests the best exam or career track for them.

7. **Database:**
   - Tech: Firebase (Firestore, Authentication, Hosting).

*Note to AI: Read this file whenever a new session starts to understand the actual technical scope and avoid assuming it's a massive enterprise application.*
