# Environment Setup

This file documents required environment variable names only. Do not store secret values here.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Fill values locally or in your platform secret manager.
3. Never commit `.env` or secret values.

## Required Variables

| Name | Purpose | Required For |
| --- | --- | --- |
| `DATABASE_URL` | Database connection string | Local app and tests |
| `AUTH_SECRET` | Session/auth signing secret | Auth |
| `EXTERNAL_API_KEY` | Placeholder external service key | External integration |

## Agent Rules

Agents may read this file and `.env.example` for variable names. Agents must not read `.env` files or request secret values in chat.

