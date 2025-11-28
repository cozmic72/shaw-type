#!/usr/bin/env python3
"""
Contact form CGI script for Shaw Type
Receives form submissions and sends them via email
"""

import cgi
import cgitb
import json
import smtplib
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# Enable CGI error reporting (for debugging - disable in production)
cgitb.enable()

# ============================================================================
# CONFIGURATION - Update these settings for your server
# ============================================================================

# Email configuration
RECIPIENT_EMAIL = "your-email@example.com"  # Change this to your email
SMTP_SERVER = "localhost"  # SMTP server (use "localhost" for local sendmail)
SMTP_PORT = 25  # SMTP port (25 for local sendmail, 587 for TLS, 465 for SSL)
USE_TLS = False  # Set to True if using port 587
USE_SSL = False  # Set to True if using port 465

# If your SMTP server requires authentication, set these:
SMTP_USERNAME = None  # Set to your SMTP username if needed
SMTP_PASSWORD = None  # Set to your SMTP password if needed

# Sender email (what appears in "From" field)
SENDER_EMAIL = "noreply@shawtype.com"  # Change this to your domain

# ============================================================================


def send_json_response(success, message="", error=""):
    """Send JSON response to client"""
    print("Content-Type: application/json")
    print()  # Blank line required by CGI

    response = {
        "success": success
    }

    if message:
        response["message"] = message
    if error:
        response["error"] = error

    print(json.dumps(response))


def validate_form_data(form):
    """Validate form data"""
    errors = []

    # Check required fields
    if 'name' not in form or not form['name'].value.strip():
        errors.append("Name is required")

    if 'email' not in form or not form['email'].value.strip():
        errors.append("Email is required")
    elif '@' not in form['email'].value:
        errors.append("Invalid email address")

    if 'message' not in form or not form['message'].value.strip():
        errors.append("Message is required")

    # Check message length (prevent spam)
    if 'message' in form and len(form['message'].value) > 5000:
        errors.append("Message is too long (max 5000 characters)")

    return errors


def send_email(name, email, message):
    """Send email via SMTP"""
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'Shaw Type Contact Form - {name}'
        msg['From'] = SENDER_EMAIL
        msg['To'] = RECIPIENT_EMAIL
        msg['Reply-To'] = email

        # Create email body
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        text_body = f"""
New contact form submission from Shaw Type

Date: {timestamp}
Name: {name}
Email: {email}

Message:
{message}

---
This message was sent via the Shaw Type contact form.
"""

        html_body = f"""
<html>
<head></head>
<body>
    <h2>New contact form submission from Shaw Type</h2>
    <p><strong>Date:</strong> {timestamp}</p>
    <p><strong>Name:</strong> {name}</p>
    <p><strong>Email:</strong> <a href="mailto:{email}">{email}</a></p>
    <h3>Message:</h3>
    <p style="white-space: pre-wrap;">{message}</p>
    <hr>
    <p style="font-size: 0.9em; color: #666;">
        This message was sent via the Shaw Type contact form.
    </p>
</body>
</html>
"""

        # Attach both plain text and HTML versions
        part1 = MIMEText(text_body, 'plain')
        part2 = MIMEText(html_body, 'html')
        msg.attach(part1)
        msg.attach(part2)

        # Send email
        if USE_SSL:
            # Use SSL connection (port 465)
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        else:
            # Use regular connection
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            if USE_TLS:
                # Upgrade to TLS (port 587)
                server.starttls()

        # Login if credentials provided
        if SMTP_USERNAME and SMTP_PASSWORD:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)

        # Send the email
        server.sendmail(SENDER_EMAIL, [RECIPIENT_EMAIL], msg.as_string())
        server.quit()

        return True, None

    except Exception as e:
        return False, str(e)


def main():
    """Main CGI handler"""
    # Get form data
    form = cgi.FieldStorage()

    # Validate form data
    errors = validate_form_data(form)
    if errors:
        send_json_response(False, error="; ".join(errors))
        return

    # Extract form data
    name = form['name'].value.strip()
    email = form['email'].value.strip()
    message = form['message'].value.strip()

    # Send email
    success, error = send_email(name, email, message)

    if success:
        send_json_response(True, message="Message sent successfully")
    else:
        send_json_response(False, error=f"Failed to send email: {error}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # Send error response
        send_json_response(False, error=f"Server error: {str(e)}")
