# LinkedIn OAuth 2.0 Setup Guide

Complete guide for configuring LinkedIn OAuth 2.0 authentication in Luxaris for channel connections.

## Overview

LinkedIn OAuth 2.0 allows Luxaris users to connect their LinkedIn accounts to publish posts directly to LinkedIn. This guide covers setting up a LinkedIn app in the LinkedIn Developer Portal and configuring it in Luxaris.

## Prerequisites

- LinkedIn account (personal or company page admin)
- Access to [LinkedIn Developer Portal](https://www.linkedin.com/developers)
- Luxaris platform admin access

---

## Step 1: Create LinkedIn App

### 1.1 Access Developer Portal

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Click **"Create app"** button

### 1.2 Fill App Details

Provide the following information:

- **App name**: `Luxaris Social Media Manager` (or your preferred name)
- **LinkedIn Page**: Select your company page (required for OAuth)
  - If you don't have a company page, create one first
- **App logo**: Upload your app logo (minimum 100x100px)
- **Legal agreement**: Check the box to agree to LinkedIn API Terms of Use

Click **"Create app"** to continue.

---

## Step 2: Configure App Settings

### 2.1 Verify Your App

After creating the app, LinkedIn requires verification:

1. Go to the **"Settings"** tab
2. Under **"App settings"**, find **"Verify"** section
3. LinkedIn will send verification email/message
4. Complete verification process
5. Wait for approval (usually instant to few hours)

### 2.2 Configure Products

1. Go to the **"Products"** tab
2. Request access to required products:
   - **"Share on LinkedIn"** - Required for posting content
   - **"Sign In with LinkedIn using OpenID Connect"** - Required for authentication

3. Click **"Request access"** for each product
4. Fill out product request forms if prompted
5. Wait for approval (can take 1-3 business days)

> **Note**: Without approved products, OAuth will fail. Ensure "Share on LinkedIn" is approved before proceeding.

---

## Step 3: Configure OAuth 2.0 Settings

### 3.1 Add Redirect URLs

1. Go to the **"Auth"** tab in your LinkedIn app
2. Scroll to **"OAuth 2.0 settings"** section
3. Under **"Redirect URLs"**, click **"Add redirect URL"**
4. Add the following URLs based on your environment:

**Development (localhost):**
```
http://localhost:3000/api/v1/channels/oauth/linkedin/callback
```

**Production:**
```
https://api.yourdomain.com/api/v1/channels/oauth/linkedin/callback
```

> **Critical**: The redirect URL must match **exactly** with the `LINKEDIN_REDIRECT_URI` in your `.env` file. Even a trailing slash difference will cause authentication to fail.

5. Click **"Update"** to save

### 3.2 Configure Scopes

LinkedIn automatically assigns scopes based on approved products. Verify you have:

- `openid` - OpenID Connect authentication
- `profile` - Basic profile information
- `email` - User email address
- `w_member_social` - Post, comment, and engage with content

These scopes are automatically granted when "Share on LinkedIn" and "Sign In with LinkedIn" products are approved.

---

## Step 4: Get Client Credentials

### 4.1 Locate Credentials

1. Go to the **"Auth"** tab in your LinkedIn app
2. Find the **"Application credentials"** section
3. You'll see:
   - **Client ID**: Long alphanumeric string
   - **Client Secret**: Click "Show" to reveal (only visible to app owners)

### 4.2 Copy Credentials

- **Client ID**: Copy the full string (e.g., `86r2t1h7c9kwyz`)
- **Client Secret**: Click **"Show"**, then copy the full string

> **Security Warning**: Never commit Client Secret to version control or share publicly. Treat it like a password.

---

## Step 5: Configure Luxaris Backend

### 5.1 Set Environment Variable

1. Open your Luxaris API `.env` file:
   ```bash
   # Location: luxaris-api/.env
   ```

2. Verify or add the redirect URI:
   ```dotenv
   # OAuth 2.0 - LinkedIn (Channel Connections)
   LINKEDIN_REDIRECT_URI=http://localhost:3000/api/v1/channels/oauth/linkedin/callback
   ```

3. For production, use your production API URL:
   ```dotenv
   LINKEDIN_REDIRECT_URI=https://api.yourdomain.com/api/v1/channels/oauth/linkedin/callback
   ```

4. Restart your Luxaris API server for changes to take effect

### 5.2 Verify Configuration

Check that your API is configured correctly:

```bash
# Check environment variables
echo $LINKEDIN_REDIRECT_URI

# Or in PowerShell
$env:LINKEDIN_REDIRECT_URI
```

---

## Step 6: Configure Luxaris Admin Panel

### 6.1 Access Channel Settings

1. Log in to Luxaris Dashboard as **admin**
2. Navigate to **Admin** → **Channels**
3. Find **LinkedIn** channel in the list
4. Click **"Configure OAuth"** or **"Settings"**

### 6.2 Enter Credentials

In the LinkedIn OAuth credentials form:

1. **Client ID**: Paste the Client ID from LinkedIn Developer Portal
2. **Client Secret**: Paste the Client Secret from LinkedIn Developer Portal
3. Click **"Save"** or **"Update"**

> **Note**: Credentials are encrypted before storing in the database using `OAUTH_CREDENTIALS_ENCRYPTION_KEY`.

### 6.3 Verify Configuration

After saving:

1. Go to **Channels** page (as regular user)
2. Find LinkedIn card
3. Status should show **"Not Connected"** (not "OAuth not configured")
4. Click **"Connect"** button
5. You should be redirected to LinkedIn authorization page

---

## Step 7: Test OAuth Flow

### 7.1 Complete Authorization

1. Click **"Connect"** on LinkedIn channel card
2. Browser redirects to LinkedIn authorization page
3. Review permissions requested:
   - View your basic profile
   - Post content on your behalf
   - Access your email address
4. Click **"Allow"** to grant permissions
5. LinkedIn redirects back to Luxaris
6. Connection should be established successfully

### 7.2 Verify Connection

After successful authorization:

- LinkedIn card shows **"Connected"** status
- Connection appears in **"Connected Accounts"** section
- You can now create and publish posts to LinkedIn

---

## Common Issues & Troubleshooting

### Issue 1: "Redirect URI Mismatch"

**Error Message**: `The redirect_uri does not match the registered value`

**Solution**:
- Verify redirect URI in LinkedIn Developer Portal **exactly** matches `.env` file
- Check for trailing slashes, http vs https, port numbers
- Ensure no URL encoding issues
- Allow 5-10 minutes for LinkedIn to propagate redirect URI changes

### Issue 2: "OAuth Credentials Not Configured"

**Error Message**: `LinkedIn OAuth credentials not configured. Please contact your administrator.`

**Solution**:
- Verify Client ID and Secret are entered in Luxaris admin panel
- Check credentials are saved in database: `SELECT * FROM luxaris.channel_oauth_credentials WHERE channel_id = (SELECT id FROM luxaris.channels WHERE key = 'linkedin');`
- Ensure no extra spaces in credentials
- Try deleting and re-entering credentials

### Issue 3: "Invalid Client ID"

**Error Message**: `invalid_client` or similar OAuth error

**Solution**:
- Verify you copied Client ID correctly (no spaces, complete string)
- Ensure app is verified in LinkedIn Developer Portal
- Check app status is not suspended or restricted
- Verify you're using OAuth 2.0 credentials, not older OAuth 1.0

### Issue 4: "Insufficient Permissions"

**Error Message**: Permission-related errors when posting

**Solution**:
- Verify **"Share on LinkedIn"** product is approved in Developer Portal
- Check `w_member_social` scope is included
- User may need to re-authorize to grant updated permissions
- Disconnect and reconnect LinkedIn in Luxaris

### Issue 5: "App Not Approved"

**Error Message**: Product access requests are pending

**Solution**:
- LinkedIn product approvals can take 1-3 business days
- Ensure all required information is filled in app settings
- Check email for LinkedIn communication about approval status
- Some products require additional verification or justification

---

## Security Best Practices

### Credential Management

- ✅ **Never commit** `.env` file to version control
- ✅ **Use environment variables** for all OAuth credentials
- ✅ **Rotate secrets** regularly (every 6-12 months)
- ✅ **Encrypt credentials** in database (Luxaris does this automatically)
- ✅ **Restrict access** to admin panel OAuth configuration

### Production Considerations

- Use **HTTPS only** for production redirect URIs
- Enable **rate limiting** on OAuth endpoints (Luxaris includes this)
- Monitor **failed authorization attempts** for security issues
- Implement **audit logging** for OAuth credential changes
- Use separate LinkedIn apps for development/staging/production

---

## LinkedIn API Limits

Be aware of LinkedIn's rate limits:

- **Personal profiles**: 
  - 150 posts per day per user
  - API rate limit: 500 calls per user per day

- **Company pages**:
  - Unlimited posts (within reasonable use)
  - Higher API rate limits

- **Throttling**: 
  - Excessive API calls may result in temporary throttling
  - Implement backoff strategies

---

## Additional Resources

- [LinkedIn OAuth 2.0 Documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [LinkedIn API Reference](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-api)
- [LinkedIn Developer Portal](https://www.linkedin.com/developers)
- [LinkedIn API Terms of Use](https://legal.linkedin.com/api-terms-of-use)

---

## Support

For Luxaris-specific OAuth issues:
- Check Luxaris API logs: `luxaris-api/logs/`
- Review error messages in browser console
- Contact Luxaris support team

For LinkedIn API issues:
- [LinkedIn Developer Support](https://www.linkedin.com/help/linkedin/answer/a1348369)
- LinkedIn Developer Community Forums

---

**Last Updated**: December 2025  
**Luxaris Version**: 1.0.0
