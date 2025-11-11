#!/bin/bash

###############################################################################
# Remove Nginx + SSL Configuration
#
# This script removes the nginx server block and SSL certificate
# for a gift-tracker instance.
#
# Usage: ./remove-nginx-ssl.sh <instance-name>
# Example: ./remove-nginx-ssl.sh user-tracker-01
###############################################################################

set -e

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Check arguments
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <instance-name>"
    echo "Example: $0 user-tracker-01"
    exit 1
fi

INSTANCE_NAME=$1
DOMAIN="${INSTANCE_NAME}.app.o3-ttgifts.com"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NGINX_CONFIG_FILE="${NGINX_SITES_AVAILABLE}/${INSTANCE_NAME}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗑️  Removing Nginx + SSL for: $DOMAIN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Remove symbolic link
echo ""
echo "🔗 Step 1: Removing symbolic link..."
if [ -L "${NGINX_SITES_ENABLED}/${INSTANCE_NAME}" ]; then
    rm "${NGINX_SITES_ENABLED}/${INSTANCE_NAME}"
    echo "✅ Removed symbolic link"
else
    echo "⚠️  Symbolic link not found (already removed?)"
fi

# Step 2: Remove nginx config file
echo ""
echo "📝 Step 2: Removing nginx configuration..."
if [ -f "$NGINX_CONFIG_FILE" ]; then
    rm "$NGINX_CONFIG_FILE"
    echo "✅ Removed nginx config: $NGINX_CONFIG_FILE"
else
    echo "⚠️  Nginx config not found (already removed?)"
fi

# Step 3: Test nginx configuration
echo ""
echo "🧪 Step 3: Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration test failed!"
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

# Step 5: Remove SSL certificate
echo ""
echo "🔐 Step 5: Removing SSL certificate..."
if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    if certbot delete --cert-name "$DOMAIN" --non-interactive; then
        echo "✅ SSL certificate removed"
    else
        echo "⚠️  Failed to remove SSL certificate (you may need to remove it manually)"
    fi
else
    echo "⚠️  SSL certificate not found (already removed?)"
fi

# Step 6: Remove log files
echo ""
echo "📋 Step 6: Removing log files..."
if [ -f "/var/log/nginx/${INSTANCE_NAME}_access.log" ]; then
    rm "/var/log/nginx/${INSTANCE_NAME}_access.log"*
    echo "✅ Removed access logs"
fi
if [ -f "/var/log/nginx/${INSTANCE_NAME}_error.log" ]; then
    rm "/var/log/nginx/${INSTANCE_NAME}_error.log"*
    echo "✅ Removed error logs"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Cleanup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Instance: $INSTANCE_NAME"
echo "Domain: $DOMAIN"
echo ""
echo "All nginx configuration and SSL certificates have been removed."
echo ""
