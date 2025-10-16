# Quick Start Guide

Get the Gift Instance Manager running in minutes!

## Prerequisites

- Node.js 20+
- Docker Desktop installed and running
- Terminal/Command Prompt

## Step 1: Build Gift Tracker Image

First, build the Docker image for the gift tracker instances:

```bash
# Navigate to gift-tracker-instance directory
cd /path/to/gift-tracker-instance

# Build Docker image
docker build -t gift-tracker:latest .

# Verify image was built
docker images | grep gift-tracker
```

You should see:
```
gift-tracker    latest    xxx    xxx ago    xxxMB
```

## Step 2: Setup Instance Manager

```bash
# Navigate to gift-instance-manager directory
cd /path/to/gift-instance-manager

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Create .env file
cp .env.example .env
```

## Step 3: Configure Environment

Edit `.env` file (or use defaults for development):

```bash
PORT=4000
NODE_ENV=development
JWT_SECRET=dev-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
DOCKER_SOCKET_PATH=/var/run/docker.sock
GIFT_TRACKER_IMAGE=gift-tracker:latest
```

## Step 4: Start the Application

Open **two terminals**:

### Terminal 1 - Backend:
```bash
cd gift-instance-manager
npm run dev
```

You should see:
```
🎉 Gift Instance Manager
📡 Server running on: http://localhost:4000
```

### Terminal 2 - Frontend:
```bash
cd gift-instance-manager
npm run dev:frontend
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

## Step 5: Access the Dashboard

1. Open your browser to **http://localhost:5173**

2. Login with default credentials:
   - Username: `admin`
   - Password: `changeme`

3. You should see the dashboard!

## Step 6: Create Your First Instance

1. Click **"Create Instance"** button

2. Fill in the form:
   - **Instance Name**: `test-instance-01`
   - **API Key**: Click "Generate" or use: `066e8866-e7a3-46d3-9efc-d00c7c9172b5`
   - **Account ID**: `68f0c824f05516c475153ab6`
   - **TikTok Username**: `user13622668497992`
   - **Port**: Use suggested port (e.g., `3000`)

3. Click **"Create Instance"**

4. Click the **Play** button to start the instance

5. Once running (green status), click **"Open Dashboard"**

6. The instance dashboard should open in a new tab at `http://localhost:3000`

## Troubleshooting

### "Docker connection failed"

**Solution**: Ensure Docker Desktop is running
```bash
# Test Docker
docker ps

# If this fails, start Docker Desktop
```

### "Image not found"

**Solution**: Build the gift-tracker image first
```bash
cd gift-tracker-instance
docker build -t gift-tracker:latest .
```

### "Port already in use"

**Solution**:
- Stop other applications using ports 4000, 5173, or 3000-4000
- Or change the PORT in `.env`

### Frontend can't connect to API

**Solution**: Check that backend is running on port 4000
```bash
curl http://localhost:4000/health
```

### Instance won't start

**Solution**: Check Docker logs
```bash
# Find container
docker ps -a | grep gift-tracker

# View logs
docker logs <container-id>
```

## Next Steps

- **Create Multiple Instances**: Click "Create Instance" again with different settings
- **Manage Instances**: Start, stop, delete instances from the dashboard
- **View Logs**: Click the file icon to see instance logs
- **Deploy to Production**: See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup

## Development Tips

### Backend Hot Reload
The backend uses `--watch` flag for auto-restart on file changes.

### Frontend Hot Reload
Vite provides instant HMR (Hot Module Replacement).

### Testing Docker Build
```bash
# Build manager (includes frontend)
docker-compose build

# Run
docker-compose up
```

### Viewing Database
```bash
# Install SQLite browser or use CLI
sqlite3 data/instances.db

# List tables
.tables

# View instances
SELECT * FROM instances;

# Exit
.quit
```

## Common Development Workflows

### Adding a New Instance
1. Dashboard → Create Instance
2. Fill form → Create
3. Start instance
4. Test at `http://localhost:[PORT]`

### Updating Instance Configuration
1. Stop the instance
2. Edit in code or UI (when edit feature added)
3. Restart instance

### Clearing All Instances
```bash
# Stop all
docker stop $(docker ps -q --filter "label=app=gift-tracker")

# Remove all
docker rm $(docker ps -aq --filter "label=app=gift-tracker")

# Or use "Delete" button in UI
```

### Reset Database
```bash
# Stop backend
# Delete database
rm data/instances.db

# Restart backend (will recreate database)
npm run dev
```

## API Testing with cURL

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changeme"}'
```

### Get Instances
```bash
# Save token from login response
TOKEN="your-jwt-token"

curl http://localhost:4000/api/instances \
  -H "Authorization: Bearer $TOKEN"
```

### Create Instance
```bash
curl -X POST http://localhost:4000/api/instances \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-01",
    "api_key": "test-key",
    "account_id": "test-account",
    "tiktok_username": "testuser",
    "port": 3001
  }'
```

## Resources

- **Main README**: [README.md](README.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Gift Tracker Docs**: ../gift-tracker-instance/README.md

## Getting Help

- Check application logs in terminal
- View browser console for frontend errors
- Use Docker commands to debug containers
- Review error messages in the UI

---

**Happy Tracking!** 🎉
