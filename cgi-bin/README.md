# CGI-BIN Setup Instructions

This directory contains the CGI script for the Shaw Type contact form.

## Quick Setup

### 1. Configure the CGI Script

Edit `contact.py` and update the configuration section at the top:

```python
# Email configuration
RECIPIENT_EMAIL = "your-email@example.com"  # Your email address
```

That's it! The script uses the `mail` command which is much simpler than SMTP.

**Note:** The Reply-To header is automatically set to the user's email address, so you can just hit "Reply" in your email client to respond to them directly.

### 2. Configure Apache

You need to tell Apache where to find CGI scripts. There are two approaches:

#### Option A: System-wide CGI directory (Recommended)

1. Copy the CGI script to Apache's cgi-bin directory:
   ```bash
   sudo cp contact.py /usr/lib/cgi-bin/
   sudo chmod +x /usr/lib/cgi-bin/contact.py
   sudo chown www-data:www-data /usr/lib/cgi-bin/contact.py
   ```

2. Enable CGI module (if not already enabled):
   ```bash
   sudo a2enmod cgi
   sudo systemctl restart apache2
   ```

3. The script will be accessible at: `https://yoursite.com/cgi-bin/contact.py`

#### Option B: Project-specific CGI directory

1. Add a ScriptAlias to your Apache configuration (in your VirtualHost or site config):
   ```apache
   <VirtualHost *:80>
       ServerName shawtype.com
       DocumentRoot /path/to/shaw-type/site

       # CGI configuration
       ScriptAlias /cgi-bin/ /path/to/shaw-type/cgi-bin/
       <Directory "/path/to/shaw-type/cgi-bin">
           AllowOverride None
           Options +ExecCGI
           AddHandler cgi-script .py
           Require all granted
       </Directory>

       # ... rest of your config ...
   </VirtualHost>
   ```

2. Enable CGI module:
   ```bash
   sudo a2enmod cgi
   sudo systemctl reload apache2
   ```

3. Make sure the script is executable and owned by www-data:
   ```bash
   chmod +x /path/to/shaw-type/cgi-bin/contact.py
   sudo chown www-data:www-data /path/to/shaw-type/cgi-bin/contact.py
   ```

### 3. Install Mail Utility

The script uses the `mail` command to send emails. Install it if not already present:

```bash
# For Debian/Ubuntu:
sudo apt-get install mailutils

# OR for other systems:
sudo apt-get install mailx
```

Make sure your server can send email (postfix, sendmail, or similar should be configured).

### 4. Verify Python 3

The script uses only Python standard library modules, so no additional packages are needed.

Make sure Python 3 is installed:
```bash
python3 --version
```

### 5. Test the Setup

1. Test the CGI script directly:
   ```bash
   python3 contact.py
   ```
   (You should see a JSON error about missing form data - this is expected)

2. Test via web browser:
   - Navigate to your Shaw Type site
   - Click on "Contact" in the menu
   - Fill out and submit the form
   - Check your email inbox

3. Check Apache error logs if something doesn't work:
   ```bash
   sudo tail -f /var/log/apache2/error.log
   ```

## Troubleshooting

### "500 Internal Server Error"

- Check Apache error logs: `sudo tail /var/log/apache2/error.log`
- Make sure script is executable: `chmod +x contact.py`
- Make sure script has correct shebang: `#!/usr/bin/env python3`
- Make sure Python 3 is installed: `python3 --version`

### "Permission denied"

- Make sure www-data can read and execute the script:
  ```bash
  sudo chown www-data:www-data contact.py
  chmod +x contact.py
  ```

### Email not sending

- Make sure `mail` command is installed: `which mail`
- Test mail command manually:
  ```bash
  echo "Test message" | mail -s "Test subject" your-email@example.com
  ```
- Check mail logs: `sudo tail /var/log/mail.log`
- Verify postfix/sendmail is running: `sudo systemctl status postfix`

### CORS errors

If you see CORS errors in browser console, make sure your Apache config allows the origin:
```apache
<Directory "/path/to/shaw-type/cgi-bin">
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "POST, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type"
</Directory>
```

And enable headers module:
```bash
sudo a2enmod headers
sudo systemctl reload apache2
```

## Security Considerations

1. **Disable cgitb in production**: In `contact.py`, comment out `cgitb.enable()` to prevent detailed error messages from being shown to users

2. **Rate limiting**: Consider adding rate limiting to prevent spam (can be done via Apache modules or in the Python script)

3. **Input validation**: The script validates basic input, but you may want to add additional checks (e.g., CAPTCHA)

4. **HTTPS**: Make sure your site uses HTTPS to protect form data in transit

5. **File permissions**: Make sure only www-data can read the script:
   ```bash
   chmod 750 /usr/lib/cgi-bin/contact.py
   sudo chown www-data:www-data /usr/lib/cgi-bin/contact.py
   ```

6. **Email header injection**: The script sanitizes input, but be aware that allowing user-controlled Reply-To headers could potentially be exploited. The current implementation is safe for normal use.

## Alternative: Using a Form Service

If you don't want to set up CGI scripts, consider using a third-party form service:
- Formspree (https://formspree.io)
- Netlify Forms (if hosted on Netlify)
- Google Forms
- EmailJS

These services handle the backend for you and can be integrated with simple JavaScript changes.
