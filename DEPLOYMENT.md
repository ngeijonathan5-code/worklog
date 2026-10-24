# WorkLog Deployment Guide

## Overview
This is a full-stack application with:
- **Frontend**: React + Vite (deployed to Netlify)
- **Backend**: Node.js + Express + SQLite (deployed to Render/Railway/Fly.io)

---

## Option 1: Deploy Frontend to Netlify + Backend to Render (Recommended)

### Step 1: Deploy Backend to Render

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render will auto-detect the `render.yaml` configuration
6. Click "Create Web Service"
7. Wait for deployment to complete
8. Copy your backend URL (e.g., `https://worklog-backend.onrender.com`)

### Step 2: Deploy Frontend to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Add environment variable:
   - **Key**: `VITE_API_BASE`
   - **Value**: `https://your-backend-url.onrender.com/api`
6. Click "Deploy site"

---

## Option 2: Deploy Both to Netlify (Frontend + Netlify Functions)

**Note**: SQLite doesn't work well on Netlify Functions due to ephemeral filesystem. You would need to migrate to a serverless database like:
- Netlify Blobs (for simple key-value)
- PlanetScale (MySQL)
- Neon (PostgreSQL)
- Supabase (PostgreSQL)

### For Netlify Functions:
1. Create `netlify/functions/api.js` with your Express app adapted for serverless
2. Update `netlify.toml` to use functions
3. Migrate database to a serverless-compatible option

---

## Option 3: Single Server Deployment (VPS/DigitalOcean/Railway)

Deploy both frontend and backend to the same server:

```bash
# On your server
git clone <your-repo>
cd staff-work-log

# Build frontend
cd frontend && npm ci && npm run build

# Start backend (serves frontend in production)
cd ../backend && npm ci
NODE_ENV=production node server.js
```

The backend serves the frontend build at `/` when `NODE_ENV=production`.

---

## Environment Variables

### Backend (.env)
```
NODE_ENV=production
PORT=3001
DATA_DIR=/app/data  # For Render disk persistence
```

### Frontend (Netlify Environment Variables)
```
VITE_API_BASE=https://your-backend-url.onrender.com/api
```

---

## Database Persistence

**Render**: Uses a persistent disk mounted at `/app/data` (configured in `render.yaml`)

**Railway**: Automatically persists `/app` directory

**Fly.io**: Use a volume mounted at `/app/data`

**Local**: Uses `backend/worklog.db` in project directory

---

## Quick Commands

```bash
# Local development
# Terminal 1 - Backend
cd backend && node server.js

# Terminal 2 - Frontend
cd frontend && npm run dev

# Production build
cd frontend && npm run build

# Test production build locally
cd frontend && npm run preview
```

---

## Troubleshooting

### CORS Issues
If you get CORS errors, ensure the backend allows your Netlify domain:
```javascript
// In backend/server.js
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-site.netlify.app'],
  credentials: true
}));
```

### API Not Found
- Check `VITE_API_BASE` is set correctly in Netlify
- Ensure backend `/api/health` endpoint works
- Check browser network tab for failed requests

### Database Errors on Render
- Ensure `DATA_DIR=/app/data` is set
- Check disk is mounted in Render dashboard
- Verify `render.yaml` has disk configuration

---

## Login Credentials (After Deployment)

**Admin**: `jonathan` / `1027`
**Staff**: `John Staff` / `staff123`

The database auto-seeds on first run.