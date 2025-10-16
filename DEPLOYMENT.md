# Deployment Guide - Gift Instance Manager

This guide covers deploying the Gift Instance Manager on `app.o3-ttgifts.com`.

## Prerequisites

- Ubuntu 20.04+ server
- Docker and Docker Compose installed
- Domain `app.o3-ttgifts.com` pointing to your server
- Root or sudo access
- At least 2GB RAM and 20GB disk space

## Step 1: Server Setup

### Install Docker

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Logout and login to apply group changes
```

### Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Install Certbot (for SSL)

```bash
sudo apt install certbot python3-certbot-nginx -y
```

## Step 2: Clone and Setup Project

```bash
# Create directory
sudo mkdir -p /opt/gift-manager
cd /opt/gift-manager

# Clone or upload your projects
# Assuming you have two directories:
# - gift-tracker-instance (for the Docker image)
# - gift-instance-manager (for the manager platform)

# Option 1: Clone from Git
git clone <your-repo-url> .

# Option 2: Upload via SCP
# From your local machine:
# scp -r /path/to/gift-instance-manager user@server:/opt/gift-manager/
# scp -r /path/to/gift-tracker-instance user@server:/opt/gift-manager/
```

## Step 3: Build Gift Tracker Docker Image

```bash
cd /opt/gift-manager/gift-tracker-instance

# Build the Docker image
docker build -t gift-tracker:latest .

# Verify image is built
docker images | grep gift-tracker
```

## Step 4: Configure Instance Manager

```bash
cd /opt/gift-manager/gift-instance-manager

# Create .env file
cp .env.example .env

# Edit configuration
nano .env
```

Update the following in `.env`:

```bash
# Server Configuration
PORT=4000
NODE_ENV=production

# Authentication - CHANGE THESE!
JWT_SECRET=your-very-secure-random-secret-key-change-this
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password-change-this

# Docker Configuration
DOCKER_SOCKET_PATH=/var/run/docker.sock
GIFT_TRACKER_IMAGE=gift-tracker:latest
INSTANCE_PORT_START=3000
INSTANCE_PORT_END=3999

# Backend API
BACKEND_API_URL=https://o3-ttgifts.com/api/instances

# Database
DATABASE_PATH=./data/instances.db
```

## Step 5: Setup Nginx Reverse Proxy

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/gift-manager
```

Add the following configuration:

```nginx
# Main manager application
server {
    listen 80;
    server_name app.o3-ttgifts.com;

    # Increase client body size for file uploads
    client_max_body_size 10M;

    # Manager application
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Individual instance proxies (ports 3000-3999)
# These will be auto-generated or manually added per instance
# Example for instance on port 3005:
server {
    listen 80;
    server_name instance-3005.app.o3-ttgifts.com;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/gift-manager /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 6: Setup SSL with Let's Encrypt

```bash
# Get SSL certificate for main domain
sudo certbot --nginx -d app.o3-ttgifts.com

# For instance subdomains (add as needed):
# sudo certbot --nginx -d instance-3005.app.o3-ttgifts.com

# Auto-renewal is set up automatically
# Test renewal:
sudo certbot renew --dry-run
```

## Step 7: Start the Manager

### Option A: Using Docker Compose (Recommended)

```bash
cd /opt/gift-manager/gift-instance-manager

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart
```

### Option B: Using NPM (Direct)

```bash
cd /opt/gift-manager/gift-instance-manager

# Install dependencies
npm install
cd frontend && npm install && npm run build && cd ..

# Start with PM2 (process manager)
sudo npm install -g pm2

pm2 start server/index.js --name gift-manager
pm2 save
pm2 startup

# View logs
pm2 logs gift-manager

# Restart
pm2 restart gift-manager
```

## Step 8: Verify Installation

1. **Check Docker containers:**
   ```bash
   docker ps
   ```

2. **Access the manager:**
   - Navigate to `https://app.o3-ttgifts.com`
   - Login with your admin credentials
   - You should see the dashboard

3. **Test creating an instance:**
   - Click "Create Instance"
   - Fill in the form
   - Start the instance
   - Access it via the provided port

## Step 9: Monitoring and Maintenance

### View Manager Logs

```bash
# Docker Compose
docker-compose logs -f

# PM2
pm2 logs gift-manager

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### View Instance Logs

From the dashboard, click the "Logs" button on any instance, or:

```bash
# List all containers
docker ps

# View logs for specific instance
docker logs <container-id>

# Follow logs
docker logs -f <container-id>
```

### Backup Database

```bash
# Backup
sudo cp /opt/gift-manager/gift-instance-manager/data/instances.db /backup/instances-$(date +%Y%m%d).db

# Restore
sudo cp /backup/instances-20240116.db /opt/gift-manager/gift-instance-manager/data/instances.db
docker-compose restart
```

### Update Application

```bash
cd /opt/gift-manager/gift-instance-manager

# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Manager won't start

```bash
# Check Docker socket permissions
ls -la /var/run/docker.sock

# Ensure Docker is running
sudo systemctl status docker

# Check logs
docker-compose logs
```

### Instances won't start

```bash
# Verify gift-tracker image exists
docker images | grep gift-tracker

# Check available ports
netstat -tulpn | grep LISTEN

# Verify environment variables in manager
docker-compose exec gift-instance-manager env
```

### Can't access via domain

```bash
# Check Nginx is running
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t

# Verify DNS
nslookup app.o3-ttgifts.com

# Check firewall
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

### SSL certificate issues

```bash
# Renew manually
sudo certbot renew

# Check certificate status
sudo certbot certificates

# View Nginx SSL config
sudo cat /etc/nginx/sites-available/gift-manager
```

## Security Recommendations

1. **Change default passwords:**
   - Update `ADMIN_PASSWORD` in `.env`
   - Use strong, random passwords

2. **Configure firewall:**
   ```bash
   sudo ufw enable
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **Limit Docker socket access:**
   - Only the manager container should have socket access
   - Use read-only mount when possible

4. **Regular updates:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   docker-compose pull
   ```

5. **Monitor logs regularly:**
   - Set up log rotation
   - Use monitoring tools (optional: Grafana, Prometheus)

6. **Backup regularly:**
   - Schedule daily database backups
   - Store backups offsite

## Performance Tuning

### For high instance count (50+):

1. **Increase file descriptors:**
   ```bash
   echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
   echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
   ```

2. **Optimize Docker:**
   ```bash
   sudo nano /etc/docker/daemon.json
   ```
   Add:
   ```json
   {
     "log-driver": "json-file",
     "log-opts": {
       "max-size": "10m",
       "max-file": "3"
     }
   }
   ```

3. **Use external database (optional):**
   - Migrate from SQLite to PostgreSQL for better concurrency

## Support

For issues or questions:
- Check application logs
- Review Docker container status
- Contact O3 Consultancy LLC

## Appendix: Quick Commands Reference

```bash
# Start manager
docker-compose up -d

# Stop manager
docker-compose down

# View logs
docker-compose logs -f

# Restart manager
docker-compose restart

# List all instances
docker ps -a --filter "label=app=gift-tracker"

# Stop all instances
docker stop $(docker ps -q --filter "label=app=gift-tracker")

# Remove stopped instances
docker rm $(docker ps -aq --filter "label=app=gift-tracker" --filter "status=exited")

# Rebuild gift-tracker image
cd /opt/gift-manager/gift-tracker-instance && docker build -t gift-tracker:latest .

# Database backup
sudo cp data/instances.db data/instances-backup-$(date +%Y%m%d).db
```
