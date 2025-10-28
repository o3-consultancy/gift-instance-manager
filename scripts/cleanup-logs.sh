#!/bin/bash

###############################################################################
# Docker Container Log Cleanup Script
#
# This script clears logs for all running gift-tracker Docker containers
# to prevent disk space issues from excessive logging.
#
# Usage: ./cleanup-logs.sh
# Cron: */30 * * * * /path/to/cleanup-logs.sh >> /var/log/gift-log-cleanup.log 2>&1
###############################################################################

LOG_PREFIX="[Gift Log Cleanup]"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "$LOG_PREFIX $TIMESTAMP - Starting log cleanup"

# Counter for tracking
TOTAL_CONTAINERS=0
CLEANED_CONTAINERS=0
FAILED_CONTAINERS=0

# Get all running containers with the gift-tracker label
CONTAINERS=$(docker ps --filter "label=app=gift-tracker" --format "{{.ID}} {{.Names}}")

if [ -z "$CONTAINERS" ]; then
    echo "$LOG_PREFIX No running gift-tracker containers found"
    exit 0
fi

# Count total containers
TOTAL_CONTAINERS=$(echo "$CONTAINERS" | wc -l)
echo "$LOG_PREFIX Found $TOTAL_CONTAINERS running gift-tracker container(s)"

# Process each container
while IFS= read -r line; do
    CONTAINER_ID=$(echo $line | awk '{print $1}')
    CONTAINER_NAME=$(echo $line | awk '{print $2}')

    # Get log file path for this container
    LOG_FILE=$(docker inspect --format='{{.LogPath}}' "$CONTAINER_ID" 2>/dev/null)

    if [ -z "$LOG_FILE" ]; then
        echo "$LOG_PREFIX   ⚠️  Could not find log file for $CONTAINER_NAME ($CONTAINER_ID)"
        ((FAILED_CONTAINERS++))
        continue
    fi

    # Check if log file exists and get its size
    if [ -f "$LOG_FILE" ]; then
        LOG_SIZE=$(du -h "$LOG_FILE" | cut -f1)

        # Truncate the log file
        if truncate -s 0 "$LOG_FILE" 2>/dev/null; then
            echo "$LOG_PREFIX   ✅ Cleared logs for $CONTAINER_NAME (was $LOG_SIZE)"
            ((CLEANED_CONTAINERS++))
        else
            echo "$LOG_PREFIX   ❌ Failed to clear logs for $CONTAINER_NAME (permission denied?)"
            ((FAILED_CONTAINERS++))
        fi
    else
        echo "$LOG_PREFIX   ⚠️  Log file not found: $LOG_FILE"
        ((FAILED_CONTAINERS++))
    fi
done <<< "$CONTAINERS"

# Summary
echo "$LOG_PREFIX ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$LOG_PREFIX Summary: $CLEANED_CONTAINERS cleaned, $FAILED_CONTAINERS failed out of $TOTAL_CONTAINERS total"
echo "$LOG_PREFIX Completed at $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

exit 0
