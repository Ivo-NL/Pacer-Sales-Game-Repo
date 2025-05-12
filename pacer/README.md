# PACER Sales Methodology Game - Deployment - pm

This directory contains all the files needed to deploy the PACER Sales Methodology Game. The application is designed to be deployed via GitHub Actions to a VPS running the deployment server.

## Structure

- `backend/` - FastAPI backend application
- `frontend/` - React frontend application
- `docker-compose.yml` - Docker Compose configuration for local development

## Deployment

### Using GitHub Actions

The application is automatically deployed when changes are pushed to the `main` branch. The deployment process:

1. Builds Docker images for backend and frontend
2. Pushes images to GitHub Container Registry (ghcr.io/pm78/pacer-sales-game-*)
3. Creates necessary deployment files
4. Sends a deployment request to the VPS

### Manual Deployment

To deploy manually:

1. Zip the application files:
   ```
   zip -r pacer-deploy.zip backend/ frontend/ docker-compose.yml .env.production
   ```

2. Upload the zip file through the deployment server web interface at:
   ```
   https://vps-d067f247.vps.ovh.ca/pacer-deploy
   ```

## Configuration

Environment variables are defined in `.env.production` and get converted to `.env` on the VPS.

Required environment variables:
- `DB_USER` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password
- `DB_NAME` - PostgreSQL database name
- `OPENAI_API_KEY` - OpenAI API key
- `JWT_SECRET` - Secret for JWT authentication

## URLs

Once deployed, the application is available at:
- Frontend: https://vps-d067f247.vps.ovh.ca/pacer
- Backend API: https://vps-d067f247.vps.ovh.ca/pacer-api
- API Documentation: https://vps-d067f247.vps.ovh.ca/pacer-docs 