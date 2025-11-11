#!/bin/bash

###############################################################################
# Nginx + SSL Setup Script for Gift Tracker Instances
#
# This script automatically:
# 1. Creates an nginx server block for a gift-tracker instance
# 2. Validates the nginx configuration
# 3. Reloads nginx
# 4. Obtains an SSL certificate via certbot
#
# Usage: ./setup-nginx-ssl.sh <instance-name> <port>
# Example: ./setup-nginx-ssl.sh user-tracker-01 3000
#
# This creates: https://user-tracker-01.app.o3-ttgifts.com -> localhost:3000
###############################################################################

set -e  # Exit on error

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Check arguments
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <instance-name> <port>"
    echo "Example: $0 user-tracker-01 3000"
    exit 1
fi

INSTANCE_NAME=$1
PORT=$2
DOMAIN="${INSTANCE_NAME}.app.o3-ttgifts.com"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NGINX_CONFIG_FILE="${NGINX_SITES_AVAILABLE}/${INSTANCE_NAME}"
EMAIL="admin@o3-ttgifts.com"  # Change this to your email

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Setting up Nginx + SSL for: $DOMAIN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Validate port number
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo "❌ Invalid port number: $PORT"
    exit 1
fi

# Validate instance name (alphanumeric and hyphens only)
if ! [[ "$INSTANCE_NAME" =~ ^[a-zA-Z0-9-]+$ ]]; then
    echo "❌ Invalid instance name. Use only letters, numbers, and hyphens."
    exit 1
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx is not installed. Please install nginx first."
    exit 1
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot is not installed. Please install certbot first."
    echo "   Run: sudo apt install certbot python3-certbot-nginx"
    exit 1
fi

# Check if config already exists
if [ -f "$NGINX_CONFIG_FILE" ]; then
    echo "⚠️  Nginx config already exists: $NGINX_CONFIG_FILE"
    read -p "   Overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

# Step 1: Create nginx server block
echo ""
echo "📝 Step 1: Creating nginx server block..."

cat > "$NGINX_CONFIG_FILE" << EOF
# Gift Tracker Instance: $INSTANCE_NAME
# Generated: $(date)

server {
    listen 80;
    server_name $DOMAIN;

    # Redirect to HTTPS (will be handled by certbot)
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL certificates (will be configured by certbot)
    # ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy settings
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logging
    access_log /var/log/nginx/${INSTANCE_NAME}_access.log;
    error_log /var/log/nginx/${INSTANCE_NAME}_error.log;
}
EOF

echo "✅ Created: $NGINX_CONFIG_FILE"

# Step 2: Create symbolic link to sites-enabled
echo ""
echo "🔗 Step 2: Creating symbolic link..."

if [ -L "${NGINX_SITES_ENABLED}/${INSTANCE_NAME}" ]; then
    rm "${NGINX_SITES_ENABLED}/${INSTANCE_NAME}"
fi

ln -s "$NGINX_CONFIG_FILE" "${NGINX_SITES_ENABLED}/${INSTANCE_NAME}"
echo "✅ Linked to sites-enabled"

# Step 3: Test nginx configuration
echo ""
echo "🧪 Step 3: Testing nginx configuration..."

if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration test failed!"
    echo "   Rolling back changes..."
    rm -f "$NGINX_CONFIG_FILE"
    rm -f "${NGINX_SITES_ENABLED}/${INSTANCE_NAME}"
    exit 1
fi

# Step 4: Reload nginx
echo ""
echo "🔄 Step 4: Reloading nginx..."

if systemctl reload nginx; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Failed to reload nginx!"
    exit 1
fi

# Step 5: Check if DNS is properly configured
echo ""
echo "🌐 Step 5: Checking DNS configuration..."

if host "$DOMAIN" > /dev/null 2>&1; then
    echo "✅ DNS record exists for $DOMAIN"
else
    echo "⚠️  Warning: DNS record not found for $DOMAIN"
    echo "   Make sure to add an A record pointing to this server's IP"
    echo "   SSL certificate request will fail without proper DNS"
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

# Step 6: Obtain SSL certificate with certbot
echo ""
echo "🔐 Step 6: Obtaining SSL certificate..."

if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect; then
    echo "✅ SSL certificate obtained and configured successfully!"
else
    echo "❌ Failed to obtain SSL certificate"
    echo "   The nginx config is still in place, but without SSL"
    echo "   You can manually run: sudo certbot --nginx -d $DOMAIN"
    exit 1
fi

# Final status
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Instance: $INSTANCE_NAME"
echo "Domain: https://$DOMAIN"
echo "Port: $PORT"
echo "Config: $NGINX_CONFIG_FILE"
echo ""
echo "🌐 Your instance is now accessible at: https://$DOMAIN"
echo ""
echo "To remove this configuration, run:"
echo "   sudo rm $NGINX_CONFIG_FILE"
echo "   sudo rm ${NGINX_SITES_ENABLED}/${INSTANCE_NAME}"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo "   sudo certbot delete --cert-name $DOMAIN"
echo ""
