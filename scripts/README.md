# Gift Instance Manager - Utility Scripts

This directory contains utility scripts for maintaining and managing the Gift Instance Manager.

## Table of Contents
1. [cleanup-logs.sh](#cleanup-logssh) - Docker log cleanup automation
2. [setup-nginx-ssl.sh](#setup-nginx-sslsh) - Nginx + SSL setup for instances
3. [remove-nginx-ssl.sh](#remove-nginx-sslsh) - Remove nginx configuration and SSL
4. [post-instance-create.sh](#post-instance-createsh) - Post-creation hook

---

## setup-nginx-ssl.sh

Automatically sets up nginx reverse proxy and SSL certificate for a gift-tracker instance.

### Features
- Creates nginx server block with reverse proxy configuration
- Validates nginx configuration before applying
- Obtains and configures SSL certificate via Let's Encrypt (certbot)
- Sets up proper security headers
- Creates domain in format: `https://{instance-name}.app.o3-ttgifts.com`
- Configures logging for each instance

### Prerequisites

```bash
# Install nginx (if not already installed)
sudo apt update
sudo apt install nginx

# Install certbot
sudo apt install certbot python3-certbot-nginx

# Ensure DNS is configured
# Add an A record: *.app.o3-ttgifts.com -> Your server IP
```

### Usage

```bash
# Make executable
chmod +x /home/o3shx_inc/gift-instance-manager/scripts/setup-nginx-ssl.sh

# Run the script
sudo /home/o3shx_inc/gift-instance-manager/scripts/setup-nginx-ssl.sh <instance-name> <port>

# Example: Setup for instance "customer1" running on port 3001
sudo /home/o3shx_inc/gift-instance-manager/scripts/setup-nginx-ssl.sh customer1 3001
```

This creates: `https://customer1.app.o3-ttgifts.com` -> `http://localhost:3001`

### What It Does

1. **Creates nginx server block** in `/etc/nginx/sites-available/`
2. **Creates symbolic link** to `/etc/nginx/sites-enabled/`
3. **Tests nginx configuration** for syntax errors
4. **Reloads nginx** to apply changes
5. **Checks DNS** configuration
6. **Obtains SSL certificate** from Let's Encrypt
7. **Configures HTTPS** with automatic HTTP->HTTPS redirect

### Important Notes

- **Requires sudo/root** - Must run with elevated privileges
- **DNS must be configured** - The domain must resolve to your server before SSL works
- **Email configuration** - Edit the `EMAIL` variable in the script for Let's Encrypt notifications
- **Rate limits** - Let's Encrypt has rate limits (50 certs/week per domain)

---

## remove-nginx-ssl.sh

Removes nginx configuration and SSL certificate for an instance.

### Usage

```bash
# Remove configuration for an instance
sudo /home/o3shx_inc/gift-instance-manager/scripts/remove-nginx-ssl.sh <instance-name>

# Example
sudo /home/o3shx_inc/gift-instance-manager/scripts/remove-nginx-ssl.sh customer1
```

### What It Does

1. Removes symbolic link from `/etc/nginx/sites-enabled/`
2. Removes nginx config file from `/etc/nginx/sites-available/`
3. Tests and reloads nginx
4. Removes SSL certificate via certbot
5. Cleans up log files

---

## post-instance-create.sh

Hook script that can be called automatically after instance creation.

### Usage

```bash
# Called automatically by the Node.js application
./post-instance-create.sh <instance-name> <port>
```

This script logs all output to `/var/log/gift-instance-nginx-setup.log`

---

## cleanup-logs.sh

Automatically clears Docker container logs for all running gift-tracker instances to prevent disk space issues.

### Features
- Finds all running gift-tracker containers
- Clears their log files safely
- Reports size of logs before cleanup
- Provides detailed summary of operations
- Safe to run repeatedly

### Manual Usage

```bash
# Make the script executable
chmod +x /home/o3shx_inc/gift-instance-manager/scripts/cleanup-logs.sh

# Run manually
sudo /home/o3shx_inc/gift-instance-manager/scripts/cleanup-logs.sh
```

**Note:** Requires `sudo` because Docker log files are owned by root.

### Automated Setup (Cron Job)

#### Option 1: Run every 30 minutes

```bash
# Edit root's crontab (required for Docker log file access)
sudo crontab -e

# Add this line to run every 30 minutes:
*/30 * * * * /home/o3shx_inc/gift-instance-manager/scripts/cleanup-logs.sh >> /var/log/gift-log-cleanup.log 2>&1
```

#### Option 2: Run every hour

```bash
# Add this line to run every hour at minute 0:
0 * * * * /home/o3shx_inc/gift-instance-manager/scripts/cleanup-logs.sh >> /var/log/gift-log-cleanup.log 2>&1
```

#### Option 3: Run twice daily (recommended for low-traffic instances)

```bash
# Add this line to run at 2 AM and 2 PM:
0 2,14 * * * /home/o3shx_inc/gift-instance-manager/scripts/cleanup-logs.sh >> /var/log/gift-log-cleanup.log 2>&1
```

### Viewing Cleanup Logs

```bash
# View recent cleanup activity
sudo tail -f /var/log/gift-log-cleanup.log

# View last 50 lines
sudo tail -50 /var/log/gift-log-cleanup.log

# Search for errors
sudo grep -i "failed\|error" /var/log/gift-log-cleanup.log
```

### Cron Schedule Examples

```
*/30 * * * *    - Every 30 minutes
0 * * * *       - Every hour
*/15 * * * *    - Every 15 minutes
0 */2 * * *     - Every 2 hours
0 0 * * *       - Once per day at midnight
0 2 * * *       - Once per day at 2 AM
```

### Troubleshooting

**"Permission denied" errors:**
- The script must run as root to access Docker log files
- Use `sudo crontab -e` instead of regular `crontab -e`

**Script not running:**
- Check cron is running: `sudo systemctl status cron` (or `crond` on some systems)
- Verify crontab entry: `sudo crontab -l`
- Check for errors: `sudo grep CRON /var/log/syslog`

**Logs not being cleaned:**
- Verify containers are labeled correctly: `docker ps --filter "label=app=gift-tracker"`
- Check Docker is accessible: `docker ps`
- Run script manually with sudo to see detailed output

### Alternative: Docker Log Rotation (System-wide)

Instead of using this script, you can configure Docker's built-in log rotation by editing `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Then restart Docker:
```bash
sudo systemctl restart docker
```

This limits each container to 3 log files of 10MB each (30MB total per container). However, this requires recreating all containers to take effect.

## Maintenance

### Rotate Cleanup Log File

The cleanup script outputs to `/var/log/gift-log-cleanup.log`. To prevent this from growing too large, you can set up log rotation:

```bash
# Create logrotate config
sudo tee /etc/logrotate.d/gift-log-cleanup << 'EOF'
/var/log/gift-log-cleanup.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

This will:
- Rotate daily
- Keep 7 days of logs
- Compress old logs
- Handle missing log files gracefully
