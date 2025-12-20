# X (Twitter) OAuth 2.0 Setup Guide

Complete guide for configuring X (formerly Twitter) OAuth 2.0 authentication in Luxaris for channel connections.

## Overview

X OAuth 2.0 allows Luxaris users to connect their X accounts to publish tweets directly. This guide covers setting up an X app in the X Developer Portal and configuring it in Luxaris.

## Prerequisites

- X (Twitter) account
- Access to [X Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- Approved Developer Account (Elevated or Basic Access)
- Luxaris platform admin access

---

## Step 1: Apply for X Developer Account

### 1.1 Create Developer Account

If you don't have a developer account:

1. Go to [X Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Click **"Sign up"** or **"Apply"**
3. Provide required information:
   - Account details
   - Intended use case (select "Building tools for myself or my organization")
   - App description (describe Luxaris social media management)
4. Accept Developer Agreement and Policy
5. Verify email address

### 1.2 Access Levels

X offers different access tiers:

- **Free Tier**: Basic access (limited functionality)
- **Basic Tier**: $100/month (better limits)
- **Pro Tier**: $5,000/month (full features)

> **Note**: For OAuth 2.0 with write permissions, you need at least **Basic Access** ($100/month). Free tier has severe restrictions and may not support posting tweets.

---

## Step 2: Create X App

### 2.1 Create New App

1. Log in to [X Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Click **"Projects & Apps"** in sidebar
3. Click **"+ Create Project"** (if you don't have one)
4. Fill project details:
   - **Project name**: `Luxaris`
   - **Use case**: Select relevant option
   - **Project description**: Describe your social media management platform

5. Click **"+ Add App"** under your project
6. Choose **"Development"** environment (or Production for live deployment)
7. Enter **App name**: `Luxaris Social Manager` (must be unique globally)

---

## Step 3: Configure App Settings

### 3.1 Basic App Settings

1. In your app dashboard, go to **"Settings"** tab
2. Update basic information:
   - **App name**: Your app name
   - **App description**: Brief description of Luxaris functionality
   - **Website URL**: Your website (e.g., `https://luxaris.com` or `http://localhost:5173`)
   - **Organization name**: Your company/organization
   - **Organization website**: Company website

3. Click **"Save"** at the bottom

### 3.2 User Authentication Settings

This is the **most critical** step:

1. In the **"Settings"** tab, scroll to **"User authentication settings"**
2. Click **"Set up"** or **"Edit"** button
3. Configure OAuth 2.0:

#### App Permissions
Select: **"Read and write"**
- Allows reading user data
- Allows posting tweets on behalf of users
- Required for social media management

#### Type of App
Select: **"Web App, Automated App or Bot"**
- Enables OAuth 2.0 with PKCE
- Supports server-to-server authentication

#### App Info
- **Callback URI / Redirect URL**:
  - Development: `http://localhost:3000/api/v1/channels/oauth/x/callback`
  - Production: `https://api.yourdomain.com/api/v1/channels/oauth/x/callback`
  
  > **Critical**: Must match exactly with `X_REDIRECT_URI` in `.env` file

- **Website URL**: Your application URL (e.g., `http://localhost:5173`)

- **Organization name**: Your company name

- **Organization website**: Your company website

- **Terms of service**: (Optional) URL to your terms

- **Privacy policy**: (Optional) URL to your privacy policy

4. Click **"Save"** at the bottom

---

## Step 4: Get Client Credentials

### 4.1 Locate OAuth 2.0 Credentials

1. Go to **"Keys and tokens"** tab in your app
2. Scroll to **"OAuth 2.0 Client ID and Client Secret"** section
3. You'll see:
   - **Client ID**: Displayed (e.g., `VnT2qHJUYXWWr0UCCQyMBRchX`)
   - **Client Secret**: Initially hidden

### 4.2 Generate/Copy Credentials

**Client ID**:
- Copy the displayed Client ID
- This is public and safe to include in URLs

**Client Secret**:
- If not generated, click **"Generate"**
- Click **"Regenerate"** if you need a new one
- Copy the secret immediately (only shown once)
- Store securely - cannot be retrieved later

> **Security Warning**: Client Secret is like a password. Never commit to version control or share publicly. If compromised, regenerate immediately.

### 4.3 Important: Use OAuth 2.0 Credentials

⚠️ **Do NOT use** the "API Key and Secret" or "Consumer Keys" - those are for OAuth 1.0a (legacy)

✅ **Use** the "OAuth 2.0 Client ID and Client Secret" section

---

## Step 5: Configure Luxaris Backend

### 5.1 Set Environment Variable

1. Open your Luxaris API `.env` file:
   ```bash
   # Location: luxaris-api/.env
   ```

2. Verify or add the redirect URI:
   ```dotenv
   # OAuth 2.0 - X/Twitter (Channel Connections)
   X_REDIRECT_URI=http://localhost:3000/api/v1/channels/oauth/x/callback
   ```

3. For production, use your production API URL:
   ```dotenv
   X_REDIRECT_URI=https://api.yourdomain.com/api/v1/channels/oauth/x/callback
   ```

4. Restart your Luxaris API server for changes to take effect

### 5.2 Verify Configuration

Check that your API is configured correctly:

```bash
# Check environment variables
echo $X_REDIRECT_URI

# Or in PowerShell
$env:X_REDIRECT_URI
```

---

## Step 6: Configure Luxaris Admin Panel

### 6.1 Access Channel Settings

1. Log in to Luxaris Dashboard as **admin**
2. Navigate to **Admin** → **Channels**
3. Find **X (Twitter)** channel in the list
4. Click **"Configure OAuth"** or **"Settings"**

### 6.2 Enter Credentials

In the X OAuth credentials form:

1. **Client ID**: Paste the OAuth 2.0 Client ID from X Developer Portal
2. **Client Secret**: Paste the OAuth 2.0 Client Secret from X Developer Portal
3. Click **"Save"** or **"Update"**

> **Note**: Credentials are encrypted before storing in the database using `OAUTH_CREDENTIALS_ENCRYPTION_KEY`.

### 6.3 Verify Configuration

After saving:

1. Go to **Channels** page (as regular user)
2. Find X (Twitter) card
3. Status should show **"Not Connected"** (not "OAuth not configured")
4. Click **"Connect"** button
5. You should be redirected to X authorization page

---

## Step 7: Test OAuth Flow

### 7.1 Complete Authorization

1. Click **"Connect"** on X (Twitter) channel card
2. Browser redirects to X authorization page
3. Review permissions requested:
   - Read tweets from your timeline
   - See accounts you follow
   - Post and delete tweets for you
   - See your email address
4. Click **"Authorize app"** to grant permissions
5. X redirects back to Luxaris
6. Connection should be established successfully

### 7.2 Verify Connection

After successful authorization:

- X card shows **"Connected"** status
- Connection appears in **"Connected Accounts"** section
- User's X handle/username is displayed
- You can now create and publish tweets via Luxaris

---

## Common Issues & Troubleshooting

### Issue 1: "Request must have a personalization id"

**Error Message**: `code: 357, message: 'Request must have a personalization id'`

**Solution**:
- This error occurs when OAuth 2.0 is not properly configured
- Go to X Developer Portal → **User authentication settings**
- Ensure **"Web App, Automated App or Bot"** is selected
- Verify OAuth 2.0 is enabled (not OAuth 1.0a)
- Save changes and wait 5-10 minutes for propagation

### Issue 2: "Client application is not allowed for this operation"

**Error Message**: `unauthorized_client` or similar

**Solution**:
- Verify **"Read and write"** permissions are enabled
- Check that **"User authentication settings"** are configured
- Ensure you're using **OAuth 2.0 Client ID**, not API Key/Consumer Key
- App must be approved and not suspended
- Some operations require elevated access level (not Free tier)

### Issue 3: "Redirect URI Mismatch"

**Error Message**: Redirect URI validation error

**Solution**:
- Verify redirect URI in X Developer Portal **exactly** matches `.env` file
- Check for trailing slashes, http vs https, port numbers
- Callback URL must be added in "User authentication settings"
- Allow 5-10 minutes for X to propagate changes
- Try clearing browser cache

### Issue 4: "OAuth Credentials Not Configured"

**Error Message**: `X (Twitter) OAuth credentials not configured. Please contact your administrator.`

**Solution**:
- Verify Client ID and Secret are entered in Luxaris admin panel
- Check credentials are saved in database
- Ensure no extra spaces when copying credentials
- Verify you copied OAuth 2.0 credentials (not Consumer Keys)
- Try deleting and re-entering credentials

### Issue 5: "Access Level Restrictions"

**Error Message**: Rate limits or feature restrictions

**Solution**:
- **Free tier** has severe limitations and may not support posting
- Upgrade to **Basic Access** ($100/month) for reliable OAuth 2.0
- Check your access level in X Developer Portal
- Review [X API access tiers](https://developer.twitter.com/en/portal/products)

### Issue 6: "App Suspended or Restricted"

**Error Message**: App-related authorization errors

**Solution**:
- Check app status in X Developer Portal
- Verify Developer Account is in good standing
- Review X API Terms of Service compliance
- Check for any policy violation notifications
- Contact X Developer Support if suspended

---

## Security Best Practices

### Credential Management

- ✅ **Never commit** `.env` file to version control
- ✅ **Use environment variables** for all OAuth credentials
- ✅ **Regenerate secrets** if compromised
- ✅ **Encrypt credentials** in database (Luxaris does this automatically)
- ✅ **Restrict access** to admin panel OAuth configuration
- ✅ **Monitor** unusual authorization patterns

### PKCE Implementation

Luxaris implements PKCE (Proof Key for Code Exchange) for enhanced security:

- Generates random `code_verifier` and `code_challenge`
- Protects against authorization code interception
- Required by X OAuth 2.0
- Handled automatically by Luxaris

### Production Considerations

- Use **HTTPS only** for production redirect URIs
- Enable **rate limiting** on OAuth endpoints (Luxaris includes this)
- Monitor **failed authorization attempts** for security issues
- Implement **audit logging** for OAuth credential changes
- Use separate X apps for development/staging/production
- Regularly review authorized applications

---

## X API Rate Limits

Be aware of X's rate limits (vary by access tier):

### Free Tier
- 1,500 tweets read per month
- Very limited write operations
- Not recommended for production

### Basic Tier ($100/month)
- 10,000 tweets read per month
- 3,000 tweets write per month per user
- 300 requests per 15 minutes (user context)

### Pro Tier ($5,000/month)
- 1,000,000 tweets read per month
- Higher write limits
- Better rate limits

### Rate Limit Handling

Luxaris automatically handles rate limits:
- Respects `x-rate-limit-*` headers
- Implements exponential backoff
- Queues tweets if rate limited
- Notifies users of rate limit issues

---

## Scopes & Permissions

X OAuth 2.0 uses scopes to define access:

**Luxaris requests these scopes**:

- `tweet.read` - Read tweets and timeline
- `tweet.write` - Post and delete tweets
- `users.read` - Read user profile information
- `offline.access` - Refresh token for long-term access

These scopes are automatically included when app permissions are set to "Read and write".

---

## X API v2 Features

Luxaris uses X API v2 endpoints:

- **Post tweets**: `POST /2/tweets`
- **Get user info**: `GET /2/users/me`
- **Upload media**: Media v1 endpoints (still used)

Ensure your X app has access to these endpoints.

---

## Additional Resources

- [X OAuth 2.0 Documentation](https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code)
- [X API Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [X Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- [X API Reference](https://developer.twitter.com/en/docs/api-reference-index)
- [X API Access Levels](https://developer.twitter.com/en/portal/products)
- [PKCE Specification (RFC 7636)](https://tools.ietf.org/html/rfc7636)

---

## Important Notes

### Access Tier Requirements

⚠️ **Critical**: To use OAuth 2.0 with write permissions (posting tweets), you need:

- **Minimum**: Basic Access ($100/month)
- **Recommended**: Pro Access for production ($5,000/month)
- Free tier is insufficient for social media management use cases

### App Review Process

X may require app review for:
- Elevated access requests
- High-volume applications
- Commercial use cases

Be prepared to provide:
- Detailed use case description
- Privacy policy and terms of service
- Screenshots or demo of application
- Expected API usage volume

### Compliance

Ensure your Luxaris deployment complies with:
- X Developer Agreement
- X API Terms of Service
- Display Requirements (proper attribution)
- Rate Limits and Fair Use Policy
- Privacy and Data Protection regulations

---

## Support

For Luxaris-specific OAuth issues:
- Check Luxaris API logs: `luxaris-api/logs/`
- Review error messages in browser console
- Verify Winston logs in terminal for detailed error information
- Contact Luxaris support team

For X API issues:
- [X Developer Community](https://twittercommunity.com/c/twitter-api/65)
- [X API Support](https://developer.twitter.com/en/support)
- Check X API Status: [https://api.twitterstat.us/](https://api.twitterstat.us/)

---

**Last Updated**: December 2025  
**Luxaris Version**: 1.0.0  
**X API Version**: v2
