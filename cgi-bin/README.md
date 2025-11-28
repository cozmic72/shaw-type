# CGI-BIN Setup Instructions

This directory contains the CGI script for the Shaw Type contact form.

## Quick Setup

### 1. Configure the CGI Script

Edit `contact.py` and update the configuration section at the top:

```python
# Email configuration
RECIPIENT_EMAIL = "your-email@example.com"  # Your email address
SMTP_SERVER = "localhost"  # Your SMTP server
SMTP_PORT = 25  # SMTP port (25 for sendmail, 587 for TLS, 465 for SSL)
```

**For local sendmail (simplest):**
- Set `SMTP_SERVER = "localhost"` and `SMTP_PORT = 25`
- Make sure sendmail is installed and configured on your server

**For external SMTP (Gmail, SendGrid, etc.):**
- Update `SMTP_SERVER`, `SMTP_PORT`, `USE_TLS`/`USE_SSL`
- Set `SMTP_USERNAME` and `SMTP_PASSWORD` if authentication is required

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

### 3. Install Python Dependencies

The script uses only Python standard library modules, so no additional packages are needed.

Make sure Python 3 is installed:
```bash
python3 --version
```

### 4. Configure Email Delivery

#### Option A: Using local sendmail (simplest)

1. Install sendmail or postfix:
   ```bash
   sudo apt-get install sendmail
   # OR
   sudo apt-get install postfix
   ```

2. Configure sendmail/postfix to relay email (many tutorials available online)

3. In `contact.py`, set:
   ```python
   SMTP_SERVER = "localhost"
   SMTP_PORT = 25
   USE_TLS = False
   USE_SSL = False
   SMTP_USERNAME = None
   SMTP_PASSWORD = None
   ```

#### Option B: Using external SMTP (Gmail example)

1. In `contact.py`, set:
   ```python
   SMTP_SERVER = "smtp.gmail.com"
   SMTP_PORT = 587
   USE_TLS = True
   USE_SSL = False
   SMTP_USERNAME = "your-gmail@gmail.com"
   SMTP_PASSWORD = "your-app-password"  # Use App Password, not regular password
   ```

2. For Gmail, you'll need to generate an App Password:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification
   - Generate an App Password for "Mail"

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

- Check SMTP settings in `contact.py`
- Test SMTP connection manually:
  ```bash
  telnet localhost 25
  # OR
  openssl s_client -connect smtp.gmail.com:587 -starttls smtp
  ```
- Check mail logs: `sudo tail /var/log/mail.log`

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

3. **Input validation**: The script validates basic input, but you may want to add additional checks

4. **HTTPS**: Make sure your site uses HTTPS to protect form data in transit

5. **File permissions**: Make sure only www-data can read the script (especially if SMTP credentials are in it)

## Alternative: Using a Form Service

If setting up CGI/SMTP is too complex, consider using a third-party form service:
- Formspree (https://formspree.io)
- Netlify Forms (if hosted on Netlify)
- Google Forms
- EmailJS

These services handle the backend for you and can be integrated with simple JavaScript changes.
