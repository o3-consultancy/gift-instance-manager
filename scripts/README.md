# Gift Instance Manager - Utility Scripts

This directory contains utility scripts for maintaining and managing the Gift Instance Manager.

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
