#!/usr/bin/env python3
"""
Contact form CGI script for Shaw Type
Receives form submissions and sends them via email using the 'mail' command
"""

import cgi
import cgitb
import json
import subprocess
import sys
from datetime import datetime

# Enable CGI error reporting (for debugging - disable in production)
cgitb.enable()

# ============================================================================
# CONFIGURATION - Update these settings for your server
# ============================================================================

# Email configuration
RECIPIENT_EMAIL = "your-email@example.com"  # Change this to your email

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
    """Send email using the 'mail' command"""
    try:
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Create email body
        email_body = f"""New contact form submission from Shaw Type

Date: {timestamp}
Name: {name}
Email: {email}

Message:
{message}

---
This message was sent via the Shaw Type contact form.
"""

        # Prepare subject
        subject = f'Shaw Type Contact Form - {name}'

        # Use the 'mail' command to send email
        # -s: subject
        # -r: Reply-To address (set to user's email for easy replying)
        # The recipient email is the last argument
        process = subprocess.Popen(
            ['mail', '-s', subject, '-r', email, RECIPIENT_EMAIL],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        stdout, stderr = process.communicate(input=email_body)

        if process.returncode != 0:
            return False, f"mail command failed: {stderr}"

        return True, None

    except FileNotFoundError:
        return False, "mail command not found. Please install mailutils or mailx package."
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
