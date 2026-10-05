# Original User Request

## Initial Request — 2026-09-08T19:51:42Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Build a backend service that scrapes government websites for new exam notifications and notifies users via email using Resend.

Working directory: c:\Users\sindh\Documents\codes\mypath-backend
Integrity mode: development

## Requirements

### R1. Exam Scraping
The backend must have a robust scraping script or module capable of fetching data from official government websites. It should extract key structured fields such as Exam Name, Organization, Important Dates (Start/End), and a link to the official notification.

### R2. Email Notifications
The backend must integrate with the Resend API to send out beautifully formatted email notifications alerting users to newly discovered exams. 

### R3. Standalone Execution
The scraping and notification logic should be runnable via local scripts (e.g., 
pm run scrape) so they can be easily tested locally or scheduled as a cron job in the future.

## Verification Resources
You can use 
ode scripts to test the modules independently. You have access to the .env file in the backend directory containing the RESEND_API_KEY.

## Acceptance Criteria

### Scraping Verification
- [ ] A test script can be run against a target URL and successfully prints structured JSON containing an Exam Name, Organization, and Deadline without crashing or getting blocked.

### Notification Verification
- [ ] A test script can be executed that successfully sends a mock exam notification email to a test address via the Resend API, receiving a success response.

### Integration
- [ ] The logic is modular so that the results of the scraper can be passed directly into the email notification sender.
