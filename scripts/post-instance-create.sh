#!/bin/bash

###############################################################################
# Post Instance Creation Hook
#
# This script is called after an instance is created to automatically
# set up nginx reverse proxy and SSL certificate.
#
# Usage: ./post-instance-create.sh <instance-name> <port>
# This is meant to be called from the Node.js application
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANCE_NAME=$1
PORT=$2

# Log output to file
LOG_FILE="/var/log/gift-instance-nginx-setup.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[$(date)] Post-instance creation hook triggered"
echo "Instance: $INSTANCE_NAME, Port: $PORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Call the nginx SSL setup script
"$SCRIPT_DIR/setup-nginx-ssl.sh" "$INSTANCE_NAME" "$PORT"

exit $?
