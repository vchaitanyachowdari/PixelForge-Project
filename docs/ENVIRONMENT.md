# Environment Configuration Guide

This directory contains environment configuration files for different deployment environments.

## Files Overview

- **`.env.example`** - Template file with all available environment variables
- **`.env.production`** - Production environment configuration
- **`.env.staging`** - Staging environment configuration
- **`.env.local`** - Local development configuration (not tracked in git)

## Setup Instructions

### Development Setup
1. Copy `.env.example` to `.env.local`
2. Fill in the required values for your local development environment
3. Run `npm run dev` to start the development server

### Staging Deployment
1. Ensure all staging environment variables are set in your deployment platform
2. Use the values from `.env.staging` as a reference
3. Deploy using `npm run deploy:staging`

### Production Deployment
1. Ensure all production environment variables are set securely
2. Use the values from `.env.production` as a reference
3. Deploy using `npm run deploy:production`

## Required Variables

### Core Application
- `NODE_ENV` - Environment type (development, staging, production)
- `VITE_APP_NAME` - Application name
- `VITE_APP_VERSION` - Application version
- `VITE_API_URL` - Backend API URL
- `VITE_APP_URL` - Frontend application URL

### Authentication
- `MOCHA_USERS_SERVICE_API_URL` - Mocha authentication service URL
- `MOCHA_USERS_SERVICE_API_KEY` - Mocha authentication API key
- `JWT_SECRET` - JWT signing secret
- `ENCRYPTION_KEY` - Data encryption key

### AI Services
- `OPENAI_API_KEY` - OpenAI API key for image generation
- `GOOGLE_CLOUD_PROJECT_ID` - Google Cloud project ID
- `GOOGLE_CLOUD_LOCATION` - Google Cloud region

### Database
- `DATABASE_URL` - Database connection string
- `DATABASE_AUTH_TOKEN` - Database authentication token

### Cloudflare
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `CLOUDFLARE_ZONE_ID` - Cloudflare zone ID

## Security Best Practices

1. **Never commit sensitive environment files** - Only `.env.example` should be in version control
2. **Use strong secrets** - Generate cryptographically secure keys for JWT_SECRET and ENCRYPTION_KEY
3. **Rotate keys regularly** - Especially in production environments
4. **Use different keys per environment** - Staging and production should have different secrets
5. **Limit access** - Only necessary team members should have access to production secrets

## Environment Variable Validation

The application includes runtime validation for all required environment variables. Missing or invalid variables will cause the application to fail startup with descriptive error messages.

## Cloudflare Workers Environment Variables

For Cloudflare Workers deployment, environment variables are managed through:

1. **wrangler.toml** - For non-sensitive configuration
2. **Cloudflare Dashboard** - For sensitive secrets
3. **wrangler secrets** - Command-line secret management

Example wrangler commands:
```bash
# Set a secret
wrangler secret put OPENAI_API_KEY

# List secrets
wrangler secret list

# Delete a secret
wrangler secret delete OPENAI_API_KEY
```

## Local Development

For local development, create `.env.local` with:

```bash
# Copy the example file
cp .env.example .env.local

# Edit with your local values
vim .env.local
```

## Troubleshooting

### Common Issues

1. **Missing environment variables** - Check that all required variables are set
2. **Invalid API keys** - Verify that API keys are correct and have proper permissions
3. **URL mismatches** - Ensure frontend and backend URLs are correctly configured
4. **CORS issues** - Verify that API URL in frontend matches backend configuration

### Debug Mode

Enable debug mode by setting:
```
VITE_ENABLE_DEBUG=true
```

This will provide additional logging and error information.