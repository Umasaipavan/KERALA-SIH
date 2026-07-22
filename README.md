# MediBot

MediBot is a Next.js-based healthcare platform designed for digital health services, AI-assisted support, and patient engagement. The project combines a modern web app experience with Firebase-backed services, document handling, reminders, payments, and AI-powered features.

## Overview

This repository contains a full-stack web application for:
- AI-assisted health conversations and document summarization
- User authentication, profile management, and verification flows
- Health tracking, reminders, appointments, and medication support
- QR-based health profile access and document submission
- Premium features, subscriptions, and payment integrations

## Tech Stack

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- Firebase / Firestore
- Stripe, PhonePe, Twilio, Resend, and Web3Forms integrations
- Cloudinary, Tesseract.js, and QR utilities
- Progressive Web App support

## Project Structure

- app/ — app routes, pages, and API endpoints
- components/ — reusable UI and feature components
- lib/ — service integrations, Firebase setup, and helper modules
- public/ — static assets and PWA resources
- scripts/ and docs/ — operational scripts and supporting documentation

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- Access to the required environment variables for Firebase, email/SMS, Stripe/PhonePe, and AI providers

### Install Dependencies

```bash
npm install
```

### Environment Configuration

Create a `.env.local` file and populate the variables described in [ENV_VARIABLES.md](ENV_VARIABLES.md). The setup guides in [FIREBASE_BLAZE_SETUP_GUIDE.md](FIREBASE_BLAZE_SETUP_GUIDE.md) and [DEV_MODE_READY.md](DEV_MODE_READY.md) are also useful for local development.

### Run the App

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Key Features

- AI chat and assistant experience
- Email verification and auth flows
- Health reminders and appointment management
- Document upload and processing workflows
- QR profile generation and access
- Subscription and checkout integrations
- Mobile-friendly and PWA-ready experience

## Deployment Notes

The project is set up for a Next.js deployment workflow and includes Firebase configuration files such as [firebase.json](firebase.json) and [firestore.rules](firestore.rules).

## Documentation

Useful references in this repository include:
- [ENV_VARIABLES.md](ENV_VARIABLES.md)
- [FIREBASE_BLAZE_SETUP_GUIDE.md](FIREBASE_BLAZE_SETUP_GUIDE.md)
- [OTP_SETUP_COMPLETE.md](OTP_SETUP_COMPLETE.md)
- [SIH_KERALA_SETUP_GUIDE.md](SIH_KERALA_SETUP_GUIDE.md)

## Contributing

Contributions are welcome. Please create a branch, make your changes, and open a pull request with a clear summary.
