# Voltex-AI Deployment Guide

This guide will walk you through deploying your Voltex-AI application for production. The application consists of a Next.js frontend, a FastAPI backend, and a MySQL database.

## Architecture Overview

We recommend the following deployment stack for the best developer experience and ease of scaling:

- **Database**: Railway or Aiven (managed MySQL)
- **Backend (FastAPI)**: Render (using the included `render.yaml`)
- **Frontend (Next.js)**: Vercel

---

## Step 1: Deploy the Database

Your backend uses SQLAlchemy with `aiomysql`. You'll need a MySQL database.

1. Sign up for [Railway](https://railway.app/) or [Aiven](https://aiven.io/).
2. Create a new **MySQL** database instance.
3. Once created, locate your **Database Connection String** (URL). It will look something like this:
   `mysql://user:password@host:port/database`
4. Since your app uses the async `aiomysql` driver, replace `mysql://` with `mysql+aiomysql://` in your connection string. Keep this URL handy for the next step.

> [!TIP]
> If you prefer PostgreSQL, you can easily switch the database provider, but you'll need to update the `database_url` default in your `backend/app/config.py` and install `asyncpg` via your requirements.txt.

---

## Step 2: Deploy the Backend (FastAPI)

We have already configured your repository with a `render.yaml` file, which makes deploying to Render extremely simple.

1. Create an account on [Render](https://render.com/).
2. Go to your Render Dashboard and click **New+** -> **Blueprint**.
3. Connect your GitHub account and select your `voltex-ai` repository.
4. Render will automatically detect the `render.yaml` file in the `backend/` directory and set up the Web Service.
5. You will be prompted to fill in the **Environment Variables**:
   - `DATABASE_URL`: The modified connection string from Step 1 (`mysql+aiomysql://...`).
   - `BACKEND_CORS_ORIGINS`: The URL where your frontend will be hosted (e.g., `https://your-frontend.vercel.app`). *You can update this later once you have your Vercel URL.*
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: The JSON string of your Firebase admin SDK credentials.
   - `GROQ_API_KEY`: Your Groq API key (`gsk_...`).
6. Click **Apply** or **Create** to deploy.
7. Once the deployment finishes, Render will provide a URL (e.g., `https://voltex-ai-backend.onrender.com`). Save this URL.

> [!IMPORTANT]
> Make sure your database provider's firewall allows connections from Render's IPs, or allows public access if you are using a provider like Railway.

---

## Step 3: Deploy the Frontend (Next.js)

Vercel is the creator of Next.js and provides the best hosting platform for it.

1. Create an account on [Vercel](https://vercel.com/) and connect your GitHub account.
2. Click **Add New** -> **Project** and select your `voltex-ai` repository.
3. In the project configuration:
   - **Framework Preset**: Vercel should automatically detect `Next.js`.
   - **Root Directory**: Click "Edit" and select `frontend`.
4. Add the following **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL from Step 2 (e.g., `https://voltex-ai-backend.onrender.com`).
   - `NEXT_PUBLIC_FIREBASE_API_KEY`: Your Firebase client API key.
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Your Firebase Auth domain.
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Your Firebase project ID.
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket.
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID.
   - `NEXT_PUBLIC_FIREBASE_APP_ID`: Your Firebase App ID.
5. Click **Deploy**. Vercel will build and deploy your Next.js application.

---

## Step 4: Final Configuration

1. **Update Backend CORS**: Now that you have your final Vercel frontend URL, go back to your Render backend dashboard. Update the `BACKEND_CORS_ORIGINS` environment variable to exactly match your Vercel URL (without a trailing slash, e.g., `https://voltex-ai-frontend.vercel.app`). Render will automatically redeploy the backend.
2. **Database Migrations**: Once the backend is running and connected to the database, you'll need to run your Alembic migrations to create the tables. You can do this by opening a "Shell" in your Render dashboard and running:
   ```bash
   alembic upgrade head
   ```

> [!NOTE]
> If you encounter issues during deployment, check the logs in both Render (for the backend) and Vercel (for the frontend). Ensure all environment variables are correctly populated.
