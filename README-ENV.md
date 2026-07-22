# Environment Files for Kerala Health App

This repository contains environment files for the Kerala Health App. The main branch contains the full project code, while this branch specifically holds environment configuration files for easy reference.

## Files in this Repository

- `.env.local` - Main environment configuration file with placeholders for sensitive values
- `README-ENV.md` - This file explaining the purpose of the repository

## How to Use

1. Clone the repository
2. Copy the `.env.local` file to your project root
3. Replace the placeholder values with your actual API keys and secrets

## Environment Variables

The `.env.local` file contains configurations for:

- Firebase (Auth, Firestore, Storage, etc.)
- Web3Forms Email Service
- QR Code Configuration
- Gemini AI API
- Various API keys for third-party services
- PhonePe Payment Integration

## Security Note

All sensitive values in this file have been replaced with placeholders. You will need to provide your own API keys and secrets for the application to function correctly.