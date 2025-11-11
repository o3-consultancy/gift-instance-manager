# Sudo Configuration for Automated Nginx + SSL Setup

To enable automatic nginx and SSL certificate setup/removal, the Node.js application needs permission to run specific scripts with sudo privileges **without a password prompt**.

## Security Approach

We'll configure sudo to allow **only the specific scripts** needed, not full sudo access. This follows the principle of least privilege.

## Setup Steps

### 1. Identify the User Running the Application

First, find out which user is running your pm2/Node.js process:

```bash
# Check which user is running the app
ps aux | grep gift-manager

# Or check pm2 status
pm2 list
```

The user is likely `o3shx_inc` based on your setup.

### 2. Create a Sudoers Configuration File

**IMPORTANT:** Never edit `/etc/sudoers` directly. Always use `visudo` or create a file in `/etc/sudoers.d/`

```bash
# Create a new sudoers file
sudo visudo -f /etc/sudoers.d/gift-instance-manager
```

### 3. Add the Following Configuration

In the editor that opens, add these lines (replace `o3shx_inc` with your actual user):

```bash
# Gift Instance Manager - Automated Nginx + SSL Setup
# Allow the application user to run nginx/certbot scripts without password

# Define the scripts that can be run
Cmnd_Alias GIFT_NGINX_SETUP = /home/o3shx_inc/gift-instance-manager/scripts/setup-nginx-ssl.sh
Cmnd_Alias GIFT_NGINX_REMOVE = /home/o3shx_inc/gift-instance-manager/scripts/remove-nginx-ssl.sh
Cmnd_Alias GIFT_LOG_CLEANUP = /home/o3shx_inc/gift-instance-manager/scripts/cleanup-logs.sh

# Allow the user to run these scripts without password
o3shx_inc ALL=(root) NOPASSWD: GIFT_NGINX_SETUP, GIFT_NGINX_REMOVE, GIFT_LOG_CLEANUP

# Optional: If you need nginx/certbot commands directly
# o3shx_inc ALL=(root) NOPASSWD: /usr/sbin/nginx, /usr/bin/certbot
```

**Explanation:**
- `o3shx_inc` - The user running the Node.js app
- `ALL=(root)` - Can run commands as root on all hosts
- `NOPASSWD:` - Don't prompt for password
- `GIFT_NGINX_SETUP` etc. - Only these specific scripts are allowed

### 4. Save and Verify

```bash
# Save the file (in visudo: Ctrl+X, then Y, then Enter)

# Verify the sudoers configuration is valid
sudo visudo -c

# Test that sudo works without password for the scripts
sudo /home/o3shx_inc/gift-instance-manager/scripts/setup-nginx-ssl.sh test-instance 3001
```

If it prompts for a password, the configuration is not working correctly.

### 5. Set Correct Permissions

```bash
# Ensure the sudoers file has correct permissions
sudo chmod 0440 /etc/sudoers.d/gift-instance-manager

# Verify
ls -l /etc/sudoers.d/gift-instance-manager
# Should show: -r--r----- 1 root root
```

## Verification

Test that the configuration works:

```bash
# Switch to the application user (if you're not already)
su - o3shx_inc

# Try running a script with sudo (should NOT ask for password)
sudo /home/o3shx_inc/gift-instance-manager/scripts/setup-nginx-ssl.sh test 3099

# If it asks for a password, the sudoers config needs adjustment
```

## Troubleshooting

### "sudo: a password is required"

**Cause:** The sudoers file isn't being read or has incorrect syntax.

**Solution:**
1. Check file permissions: `ls -l /etc/sudoers.d/gift-instance-manager`
2. Verify syntax: `sudo visudo -c`
3. Check file is being included: `sudo grep -r "includedir" /etc/sudoers`

### "sudo: sorry, user o3shx_inc is not allowed to execute..."

**Cause:** The script path doesn't match exactly.

**Solution:**
1. Get the absolute path: `realpath /home/o3shx_inc/gift-instance-manager/scripts/setup-nginx-ssl.sh`
2. Update the sudoers file with the exact path
3. Make sure there are no symlinks causing path mismatches

### Scripts still prompt for password when run by Node.js

**Cause:** The Node.js process may be running as a different user.

**Solution:**
```bash
# Find the actual user running the process
ps aux | grep "gift-instance-manager"

# Update the sudoers file with the correct user
```

## Security Considerations

### ✅ Good Practices

- **Specific commands only** - Only the exact scripts needed are allowed
- **No wildcards** - We don't use `*` in paths
- **Absolute paths** - Full paths prevent malicious script substitution
- **Limited user** - Only the app user has these privileges

### ⚠️ Important Notes

1. **Script security** - Anyone who can modify the allowed scripts can run arbitrary code as root
2. **File permissions** - Protect the scripts from unauthorized modification:
   ```bash
   # Set scripts to root ownership (optional for extra security)
   sudo chown root:root /home/o3shx_inc/gift-instance-manager/scripts/*.sh
   sudo chmod 755 /home/o3shx_inc/gift-instance-manager/scripts/*.sh
   ```

3. **Audit trail** - Sudo commands are logged to `/var/log/auth.log`:
   ```bash
   # View sudo usage
   sudo grep COMMAND /var/log/auth.log | grep gift-instance
   ```

## Alternative: Run PM2 as Root (NOT RECOMMENDED)

You could run pm2 as root, but this is **much less secure**:

```bash
# NOT RECOMMENDED - Only if sudo approach doesn't work
sudo pm2 start ecosystem.config.js
sudo pm2 save
```

This gives the entire application root privileges, which is a security risk.

## Rollback

To remove the sudo configuration:

```bash
# Remove the sudoers file
sudo rm /etc/sudoers.d/gift-instance-manager

# Verify removal
sudo visudo -c
```

## Testing the Integration

After setting up sudo, test the automated nginx setup:

1. **Create an instance** in the web interface
2. **Check pm2 logs** to see if nginx setup runs:
   ```bash
   pm2 logs gift-manager --lines 50
   ```
3. **Verify nginx config** was created:
   ```bash
   ls -la /etc/nginx/sites-available/ | grep <instance-name>
   ```
4. **Test the SSL certificate**:
   ```bash
   sudo certbot certificates | grep <instance-name>
   ```

## Monitoring

View automated nginx setup activity:

```bash
# Application logs
pm2 logs gift-manager | grep nginx

# Sudo command logs
sudo grep gift-instance /var/log/auth.log

# Nginx setup logs
sudo tail -f /var/log/gift-instance-nginx-setup.log
```

## Production Recommendations

1. **Set up log rotation** for nginx setup logs
2. **Monitor sudo usage** for suspicious activity
3. **Backup sudoers configuration** as part of your backup strategy
4. **Document** which scripts have sudo access in your runbook
5. **Regular audits** of script contents to ensure they haven't been tampered with

## Support

If you encounter issues:

1. Check `/var/log/auth.log` for sudo errors
2. Verify script paths are absolute and correct
3. Test scripts manually with sudo first
4. Check pm2 logs for detailed error messages
