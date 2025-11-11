# Nginx + SSL Automation Setup Guide

This guide explains how to set up automatic nginx reverse proxy and SSL certificates for your gift-tracker instances.

## Overview

When you create a new instance, you can automatically:
1. Create an nginx reverse proxy configuration
2. Obtain an SSL certificate from Let's Encrypt
3. Configure the domain: `https://{instance-name}.app.o3-ttgifts.com`

## Prerequisites

### 1. DNS Configuration

Add a wildcard DNS record for your subdomain:

```
Type: A
Name: *.app
Value: YOUR_SERVER_IP
TTL: 3600
```

This allows any subdomain like `customer1.app.o3-ttgifts.com` to point to your server.

**Verify DNS is working:**
```bash
# Should return your server IP
host customer1.app.o3-ttgifts.com
```

### 2. Install Required Software

On your production server:

```bash
# Update package list
sudo apt update

# Install nginx (if not already installed)
sudo apt install nginx

# Install certbot for SSL certificates
sudo apt install certbot python3-certbot-nginx

# Verify installations
nginx -v
certbot --version
```

### 3. Configure Certbot Email

Edit the script to set your email for Let's Encrypt notifications:

```bash
# Edit the setup script
sudo nano /home/o3shx_inc/gift-instance-manager/scripts/setup-nginx-ssl.sh

# Find this line and change the email:
EMAIL="admin@o3-ttgifts.com"  # Change to your email
```

## Usage

### Manual Setup (For Existing Instances)

If you already have instances running and want to add nginx + SSL:

```bash
cd /home/o3shx_inc/gift-instance-manager

# Setup nginx + SSL for an instance
sudo ./scripts/setup-nginx-ssl.sh <instance-name> <port>

# Example: Instance "customer1" running on port 3001
sudo ./scripts/setup-nginx-ssl.sh customer1 3001
```

**What happens:**
1. Creates nginx config: `/etc/nginx/sites-available/customer1`
2. Enables the site: Symlink to `/etc/nginx/sites-enabled/`
3. Tests nginx configuration
4. Reloads nginx
5. Obtains SSL certificate from Let's Encrypt
6. Configures HTTPS with auto-redirect from HTTP

**Result:** `https://customer1.app.o3-ttgifts.com` now proxies to `localhost:3001`

### Automatic Setup (For New Instances)

To automatically run nginx setup when creating new instances, you would integrate the script into your instance creation flow. The `post-instance-create.sh` hook is provided for this purpose.

### Removing Configuration

When deleting an instance, clean up its nginx config and SSL certificate:

```bash
# Remove nginx + SSL for an instance
sudo ./scripts/remove-nginx-ssl.sh <instance-name>

# Example
sudo ./scripts/remove-nginx-ssl.sh customer1
```

## Testing

### 1. Test Individual Instance

```bash
# Check if nginx config exists
ls -la /etc/nginx/sites-available/customer1

# Test nginx configuration
sudo nginx -t

# Check if SSL certificate was issued
sudo certbot certificates | grep customer1

# Test the URL
curl -I https://customer1.app.o3-ttgifts.com
```

### 2. View Logs

```bash
# Nginx access logs for the instance
sudo tail -f /var/log/nginx/customer1_access.log

# Nginx error logs
sudo tail -f /var/log/nginx/customer1_error.log

# Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Setup script logs
sudo tail -f /var/log/gift-instance-nginx-setup.log
```

## Troubleshooting

### DNS Not Resolving

**Problem:** `DNS record not found for {instance}.app.o3-ttgifts.com`

**Solution:**
1. Verify wildcard DNS record is configured: `*.app.o3-ttgifts.com`
2. Wait for DNS propagation (can take up to 24 hours)
3. Test with: `dig customer1.app.o3-ttgifts.com`

### SSL Certificate Failed

**Problem:** `Failed to obtain SSL certificate`

**Common causes:**
1. **DNS not configured** - Domain must resolve before certbot can verify
2. **Port 80/443 blocked** - Certbot needs these ports open
3. **Rate limit reached** - Let's Encrypt allows 50 certs/week per domain

**Check firewall:**
```bash
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

**Manual certificate retry:**
```bash
sudo certbot --nginx -d customer1.app.o3-ttgifts.com
```

### Nginx Configuration Error

**Problem:** `nginx: configuration file test failed`

**Solution:**
```bash
# Test configuration with detailed output
sudo nginx -t

# Check syntax of specific config
sudo nginx -t -c /etc/nginx/sites-available/customer1

# View nginx error log
sudo tail -50 /var/log/nginx/error.log
```

### Certificate Renewal

Let's Encrypt certificates expire after 90 days. Certbot automatically sets up renewal via cron/systemd timer.

**Check auto-renewal:**
```bash
# Test renewal process (dry run)
sudo certbot renew --dry-run

# View renewal timer
sudo systemctl status certbot.timer

# Manually renew all certificates
sudo certbot renew
```

### Port Already in Use

**Problem:** Another nginx config is using the same domain

**Solution:**
```bash
# Find conflicting configs
grep -r "customer1.app.o3-ttgifts.com" /etc/nginx/sites-enabled/

# Remove conflicting config
sudo rm /etc/nginx/sites-enabled/conflicting-config
sudo nginx -t && sudo systemctl reload nginx
```

## Security Considerations

### 1. SSL/TLS Configuration

The script uses certbot's recommended SSL configuration, which includes:
- TLS 1.2 and 1.3
- Strong cipher suites
- HSTS headers (added by certbot)

### 2. Security Headers

The nginx config includes:
- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME-type sniffing
- `X-XSS-Protection: 1; mode=block` - XSS protection for older browsers

### 3. Rate Limiting

Consider adding rate limiting to prevent abuse:

```nginx
# Add to /etc/nginx/nginx.conf in http block
limit_req_zone $binary_remote_addr zone=gift_limit:10m rate=10r/s;

# Then in each server block (in the script)
limit_req zone=gift_limit burst=20 nodelay;
```

## Nginx Configuration Details

Each instance gets a configuration like this:

```nginx
server {
    listen 80;
    server_name customer1.app.o3-ttgifts.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name customer1.app.o3-ttgifts.com;

    # SSL (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/customer1.app.o3-ttgifts.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/customer1.app.o3-ttgifts.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Reverse proxy
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Maintenance

### View All Instance Configurations

```bash
# List all gift-tracker nginx configs
ls -la /etc/nginx/sites-available/ | grep -v default

# View active configs
ls -la /etc/nginx/sites-enabled/
```

### Bulk Operations

```bash
# List all SSL certificates
sudo certbot certificates

# Renew all certificates
sudo certbot renew

# Test all nginx configs
sudo nginx -t
```

### Backup Configurations

```bash
# Backup all nginx configs
sudo tar -czf nginx-configs-backup-$(date +%Y%m%d).tar.gz /etc/nginx/sites-available/

# Backup SSL certificates
sudo tar -czf letsencrypt-backup-$(date +%Y%m%d).tar.gz /etc/letsencrypt/
```

## Advanced: Load Balancing

If you want to run multiple containers for the same instance (load balancing):

```nginx
upstream customer1_backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    # ... SSL config ...

    location / {
        proxy_pass http://customer1_backend;
        # ... other proxy settings ...
    }
}
```

## Support

For issues or questions:
1. Check logs: `/var/log/nginx/` and `/var/log/gift-instance-nginx-setup.log`
2. Review nginx docs: https://nginx.org/en/docs/
3. Review certbot docs: https://certbot.eff.org/docs/
