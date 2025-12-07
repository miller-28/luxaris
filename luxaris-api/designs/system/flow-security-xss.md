# XSS (Cross-Site Scripting) Protection Flow

## Overview
This document describes the data flow and protection mechanisms against XSS attacks in the Luxaris API and frontend.

## Attack Type 1: Stored XSS

```
┌─────────────────────────────────────────────────────────────────┐
│                        Stored XSS Attack                         │
│                         (Persistent)                             │
└─────────────────────────────────────────────────────────────────┘

Attacker              API Handler          Repository          Database
  │                       │                    │                  │
  │  1. POST /posts       │                    │                  │
  │  {                    │                    │                  │
  │    title: "Normal",   │                    │                  │
  │    content: "<script>alert(document.cookie)</script>"         │
  │  }                    │                    │                  │
  ├──────────────────────>│                    │                  │
  │                       │  ❌ NO SANITIZATION│                  │
  │                       │                    │                  │
  │                       │  Store Content     │                  │
  │                       ├───────────────────>│                  │
  │                       │                    │  INSERT INTO     │
  │                       │                    │  posts (content) │
  │                       │                    │  VALUES ($1)     │
  │                       │                    ├─────────────────>│
  │                       │                    │  🚨 MALICIOUS    │
  │                       │                    │     SCRIPT STORED│
  │  201 Created          │                    │<─────────────────┤
  │<──────────────────────┤                    │                  │
  │                       │                    │                  │


Victim                 API                  Database           Browser
  │                       │                    │                  │
  │  2. GET /posts/123    │                    │                  │
  ├──────────────────────>│                    │                  │
  │                       │  Retrieve Post     │                  │
  │                       ├───────────────────>│                  │
  │                       │  SELECT content    │                  │
  │                       │  FROM posts        │                  │
  │                       │<───────────────────┤                  │
  │                       │  content:          │                  │
  │                       │  "<script>alert...</script>"          │
  │                       │                    │                  │
  │  Response:            │                    │                  │
  │  { content: "<script>alert...</script>" }  │                  │
  │<──────────────────────┤                    │                  │
  │                       │                    │                  │
  │  3. Frontend renders  │                    │                  │
  │     (dangerouslySetInnerHTML)              │                  │
  ├────────────────────────────────────────────────────────────────>
  │                       │                    │  🚨 SCRIPT       │
  │                       │                    │     EXECUTES!    │
  │                       │                    │  - Steal cookies │
  │                       │                    │  - Session hijack│
  │                       │                    │  - Data theft    │
  │                       │                    │                  │
```

## Protection Flow: Input Sanitization

```
┌─────────────────────────────────────────────────────────────────┐
│              Protected: Input Sanitization Layer                 │
└─────────────────────────────────────────────────────────────────┘

Client                Handler              Sanitizer          Repository
  │                       │                    │                  │
  │  POST /posts          │                    │                  │
  │  {                    │                    │                  │
  │    title: "Test",     │                    │                  │
  │    content: "<script>alert('XSS')</script><p>Safe content</p>"│
  │  }                    │                    │                  │
  ├──────────────────────>│                    │                  │
  │                       │  Sanitize Input    │                  │
  │                       ├───────────────────>│                  │
  │                       │                    │  XSS Library:    │
  │                       │                    │  1. Parse HTML   │
  │                       │                    │  2. Whitelist    │
  │                       │                    │     tags         │
  │                       │                    │  3. Remove       │
  │                       │                    │     dangerous    │
  │                       │                    │     attributes   │
  │                       │                    │                  │
  │                       │  Clean Content     │                  │
  │                       │<───────────────────┤                  │
  │                       │  "<p>Safe content</p>"                │
  │                       │  🛡️ <script> removed                  │
  │                       │                    │                  │
  │                       │  Store Sanitized   │                  │
  │                       ├────────────────────────────────────────>
  │                       │  INSERT INTO posts                    │
  │                       │  VALUES ($1)                          │
  │                       │  ["<p>Safe content</p>"]              │
  │                       │                    │                  │
  │  201 Created          │                    │                  │
  │<──────────────────────┤                    │                  │
  │  { content: "<p>Safe content</p>" }        │                  │
  │                       │                    │                  │
```

## Plain Text vs Rich Text Sanitization

```
┌─────────────────────────────────────────────────────────────────┐
│               Plain Text Sanitization (Strict)                   │
└─────────────────────────────────────────────────────────────────┘

Input: "Hello <strong>World</strong><script>alert(1)</script>"
       │
       ├─> InputSanitizer.sanitize_plain_text()
       │   - Remove ALL HTML tags
       │   - Remove dangerous characters: < > ' "
       │
Output: "Hello World"
       │
       └─> Safe for: Titles, names, short text


┌─────────────────────────────────────────────────────────────────┐
│               Rich Text Sanitization (Selective)                 │
└─────────────────────────────────────────────────────────────────┘

Input: "<p>Hello <strong>World</strong></p><script>alert(1)</script>"
       │
       ├─> InputSanitizer.sanitize_rich_text()
       │   - Allow whitelisted tags: p, strong, em, ul, ol, li, a, h1-h4
       │   - Remove <script>, <style>, event handlers
       │   - Validate URLs in href/src
       │
Output: "<p>Hello <strong>World</strong></p>"
       │
       └─> Safe for: Blog posts, comments, descriptions
```

## Attack Type 2: Reflected XSS

```
┌─────────────────────────────────────────────────────────────────┐
│                       Reflected XSS Attack                       │
└─────────────────────────────────────────────────────────────────┘

Attacker                                    Victim
  │                                           │
  │  1. Craft malicious URL:                  │
  │     https://luxaris.com/search?           │
  │     q=<script>alert(1)</script>           │
  │                                           │
  │  2. Send link to victim                   │
  │     (email, social media, etc.)           │
  ├──────────────────────────────────────────>│
  │                                           │
  │                                           │  3. Victim clicks
  │                                           │     link
  │                                           │
Victim Browser         API Handler           Response
  │                       │                    │
  │  GET /search?         │                    │
  │  q=<script>alert(1)   │                    │
  ├──────────────────────>│                    │
  │                       │  ❌ VULNERABLE:    │
  │                       │  Reflect query in  │
  │                       │  response without  │
  │                       │  encoding          │
  │                       │                    │
  │  Response:            │                    │
  │  <h1>Search results   │                    │
  │   for: <script>       │                    │
  │   alert(1)</script>   │                    │
  │  </h1>                │                    │
  │<──────────────────────┤                    │
  │                       │                    │
  │  🚨 Script executes   │                    │
  │     in victim's       │                    │
  │     browser!          │                    │
  │                       │                    │
```

## Protection: JSON API + React Escaping

```
┌─────────────────────────────────────────────────────────────────┐
│            Protected: API Returns JSON + React Escaping          │
└─────────────────────────────────────────────────────────────────┘

Client                 API Handler           React Frontend
  │                       │                    │
  │  GET /posts?          │                    │
  │  search=<script>      │                    │
  ├──────────────────────>│                    │
  │                       │  Sanitize Query    │
  │                       │  Parameter         │
  │                       │                    │
  │                       │  Search DB with    │
  │                       │  safe query        │
  │                       │                    │
  │  Response (JSON):     │                    │
  │  {                    │                    │
  │    query: "<script>alert(1)</script>",     │
  │    results: []        │                    │
  │  }                    │                    │
  │<──────────────────────┤                    │
  │                       │                    │
  │  🛡️ JSON format - no HTML execution        │
  │                       │                    │
  │  Pass to React        │                    │
  ├────────────────────────────────────────────>│
  │                       │  React Rendering:  │
  │                       │  <h1>Search: {query}</h1>
  │                       │                    │
  │                       │  🛡️ React auto-escapes:
  │                       │  <h1>Search: &lt;script&gt;
  │                       │   alert(1)&lt;/script&gt;</h1>
  │                       │                    │
  │                       │  Script NOT executed│
  │                       │                    │
```

## Attack Type 3: DOM-Based XSS

```
┌─────────────────────────────────────────────────────────────────┐
│                      DOM-Based XSS Attack                        │
└─────────────────────────────────────────────────────────────────┘

Frontend Code (VULNERABLE):
    │
    │  // Bad code example
    │  const url_params = new URLSearchParams(window.location.search);
    │  const message = url_params.get('message');
    │  
    │  // ❌ DANGEROUS: Direct DOM manipulation
    │  document.getElementById('output').innerHTML = message;
    │

User visits: https://luxaris.com/#message=<img src=x onerror="alert(1)">

Browser
  │
  │  1. Load page
  │  2. Execute JavaScript
  │  3. Extract "message" from URL fragment
  │     message = "<img src=x onerror='alert(1)'>"
  │  
  │  4. Insert into DOM via innerHTML
  │     <div id="output">
  │       <img src=x onerror="alert(1)">
  │     </div>
  │
  │  5. 🚨 onerror handler executes
  │     alert(1) runs in user's context
  │
```

## Protection: Safe DOM Manipulation

```
┌─────────────────────────────────────────────────────────────────┐
│              Protected: Safe DOM Manipulation                    │
└─────────────────────────────────────────────────────────────────┘

React Component (SAFE):
    │
    │  // ✅ SAFE: React auto-escapes
    │  function MessageDisplay() {
    │    const [searchParams] = useSearchParams();
    │    const message = searchParams.get('message');
    │    
    │    return <div>{message}</div>;  // Auto-escaped
    │  }
    │

Alternative - Using DOMPurify:
    │
    │  // ✅ SAFE: Explicit sanitization
    │  import DOMPurify from 'dompurify';
    │  
    │  function RichMessage({ html }) {
    │    const clean = DOMPurify.sanitize(html);
    │    return <div dangerouslySetInnerHTML={{ __html: clean }} />;
    │  }
    │

Result:
    │
    │  Input: "<img src=x onerror='alert(1)'>"
    │  
    │  React rendering:
    │  <div>&lt;img src=x onerror='alert(1)'&gt;</div>
    │  
    │  OR DOMPurify result:
    │  <div><img src="x"></div>  // onerror removed
    │  
    │  🛡️ Script NOT executed
    │
```

## Content Security Policy (CSP) Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              Content Security Policy Protection                  │
└─────────────────────────────────────────────────────────────────┘

API Server             HTTP Response          Browser
  │                       │                     │
  │  Set CSP Header       │                     │
  ├──────────────────────>│                     │
  │  Content-Security-    │                     │
  │  Policy:              │                     │
  │  default-src 'self';  │                     │
  │  script-src 'self'    │                     │
  │    https://cdn.luxaris│                     │
  │  style-src 'self'     │                     │
  │    'unsafe-inline';   │                     │
  │  img-src 'self' https:│                     │
  │                       ├────────────────────>│
  │                       │                     │  Browser enforces
  │                       │                     │  CSP rules
  │                       │                     │
  │                       │  Page tries to      │
  │                       │  execute:           │
  │                       │  <script>alert(1)   │
  │                       │  </script>          │
  │                       │                     │
  │                       │  ❌ CSP BLOCKS:     │
  │                       │  "Refused to execute│
  │                       │   inline script"    │
  │                       │                     │
  │                       │  Console Error:     │
  │                       │  CSP violation      │
  │                       │                     │
  │                       │  🛡️ Attack blocked  │
  │                       │     by browser      │
  │                       │                     │
```

## Field-Specific Sanitization Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              Field-Specific Sanitization Strategy                │
└─────────────────────────────────────────────────────────────────┘

POST /api/v1/posts
{
  "title": "<script>alert(1)</script>Hello",
  "content": "<p>Safe <strong>text</strong></p><script>bad</script>",
  "excerpt": "Normal <b>text</b>",
  "tags": ["<script>", "normal"]
}
                    │
                    ├─> Sanitization Middleware
                    │
                    │  title (plain_text):
                    │    Remove ALL HTML
                    │    → "Hello"
                    │
                    │  content (rich_text):
                    │    Allow: p, strong, em, ul, ol, li, a, h1-h4
                    │    Remove: script, style, event handlers
                    │    → "<p>Safe <strong>text</strong></p>"
                    │
                    │  excerpt (plain_text):
                    │    Remove ALL HTML
                    │    → "Normal text"
                    │
                    │  tags (array of plain_text):
                    │    Remove HTML from each
                    │    → ["", "normal"]
                    │
                    ├─> Store in Database
                    │
{
  "title": "Hello",
  "content": "<p>Safe <strong>text</strong></p>",
  "excerpt": "Normal text",
  "tags": ["normal"]
}
                    │
                    └─> 🛡️ All malicious content removed
```

## Frontend Rendering Decision Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  Frontend Rendering Strategy                     │
└─────────────────────────────────────────────────────────────────┘

Receive Data from API
        │
        ├─> Is it plain text?
        │   (title, name, email, etc.)
        │   │
        │   └─> ✅ Use React's automatic escaping
        │       <h1>{post.title}</h1>
        │       No additional sanitization needed
        │
        ├─> Is it rich text HTML?
        │   (blog content, formatted description)
        │   │
        │   └─> ⚠️  Use DOMPurify + dangerouslySetInnerHTML
        │       const clean = DOMPurify.sanitize(html);
        │       <div dangerouslySetInnerHTML={{ __html: clean }} />
        │
        ├─> Is it user input from form?
        │   │
        │   └─> ✅ React handles automatically
        │       <input value={userInput} />
        │       onChange updates state safely
        │
        └─> Is it URL/link?
            │
            └─> ✅ Validate protocol first
                Only allow: http://, https://
                <a href={sanitizedUrl}>Link</a>
```

## Monitoring & Detection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    XSS Attempt Detection                         │
└─────────────────────────────────────────────────────────────────┘

Request               Sanitizer           Logger              Alert
  │                       │                   │                  │
  │  POST /posts          │                   │                  │
  │  { content:           │                   │                  │
  │    "<script>steal()   │                   │                  │
  │     </script>..."     │                   │                  │
  │  }                    │                   │                  │
  ├──────────────────────>│                   │                  │
  │                       │  Detect XSS       │                  │
  │                       │  Pattern:         │                  │
  │                       │  - <script>       │                  │
  │                       │  - javascript:    │                  │
  │                       │  - onerror=       │                  │
  │                       │  - onclick=       │                  │
  │                       │                   │                  │
  │                       │  🚨 DETECTED      │                  │
  │                       │                   │                  │
  │                       │  Log Attempt      │                  │
  │                       ├──────────────────>│                  │
  │                       │  {                │                  │
  │                       │    event: "xss_attempt",             │
  │                       │    pattern: "<script>",              │
  │                       │    endpoint: "/posts",               │
  │                       │    user_id: "123",                   │
  │                       │    content_sample: "..."             │
  │                       │  }                │                  │
  │                       │                   │                  │
  │                       │  Sanitize Content │                  │
  │                       │  (Remove script)  │                  │
  │                       │                   │                  │
  │                       │                   │  Check Threshold │
  │                       │                   │  Multiple        │
  │                       │                   │  attempts?       │
  │                       │                   │                  │
  │                       │                   │  Send Alert      │
  │                       │                   ├─────────────────>│
  │                       │                   │  "User 123       │
  │                       │                   │   attempting XSS"│
  │                       │                   │                  │
  │  201 Created          │                   │                  │
  │  (with sanitized      │                   │                  │
  │   content)            │                   │                  │
  │<──────────────────────┤                   │                  │
  │                       │                   │                  │
```

## Key Protection Layers

1. **Input Sanitization** (API - First Line)
   - Plain text: Remove all HTML
   - Rich text: Whitelist safe HTML, remove scripts/handlers
   - URL validation: Check protocols

2. **Output Encoding** (Frontend - React)
   - React auto-escapes by default
   - DOMPurify for rich HTML content

3. **Content Security Policy**
   - Block inline scripts
   - Whitelist script sources
   - Report violations

4. **HTTP-Only Cookies**
   - Prevent JavaScript access to session tokens

5. **Monitoring**
   - Log XSS attempts
   - Alert on patterns
   - Track repeat offenders

## References

- design-9-security-xss.md - Full design document
- OWASP XSS: https://owasp.org/www-community/attacks/xss/
- DOMPurify: https://github.com/cure53/DOMPurify
- React Security: https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html
