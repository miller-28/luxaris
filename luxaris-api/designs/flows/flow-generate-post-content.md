# Flow: Generate Post Content

**Endpoint:** `POST /api/v1/posts/generate`

**Context:** Posts - Content Generation (AI)

**Purpose:** Generate post content and variants using AI based on user input and templates.

---

## Request

```json
{
  "template_id": "template-uuid-456",
  "context": {
    "topic": "Product Launch",
    "tone": "professional",
    "key_points": [
      "New feature: Real-time collaboration",
      "Available starting next week",
      "Free for all users"
    ],
    "target_audience": "small business owners"
  },
  "channels": ["x-channel-uuid", "linkedin-channel-uuid"],
  "options": {
    "include_hashtags": true,
    "include_emojis": false,
    "variants_per_channel": 2
  }
}
```

---

## Flow Steps

1. **Authenticate Request**
   - Verify JWT token
   - Extract `principal_id` from token

2. **Validate Input**
   - Validate `template_id` (if provided)
   - Validate `channels` array is not empty
   - Validate context fields
   - Validate options are within limits

3. **Fetch Template (if provided)**
   - Query `templates` table by `template_id`
   - Return 404 if not found
   - Check user has access to template

4. **Build AI Prompt**
   - Combine template with user context
   - Include channel-specific requirements:
     - Character limits
     - Media requirements
     - Best practices
   - Structure prompt for AI model

5. **Call AI Service**
   - Use configured AI provider (OpenAI, Anthropic, etc.)
   - Request multiple variants per channel
   - Include system prompt for tone and style

6. **Process AI Response**
   - Parse generated content
   - Validate each variant meets channel requirements
   - Extract hashtags and mentions
   - Calculate character counts

7. **Create Post Record (draft)**
   - Insert into `posts` table:
     - `id` (UUID)
     - `owner_principal_id`
     - `title` (derived from topic)
     - `status` = `draft`
     - `created_via` = `ai_generation`

8. **Create Variant Records**
   - For each generated variant:
     - Insert into `post_variants` table
     - Status = `draft`
     - Link to post
     - Link to channel

9. **Store Generation Metadata**
   - Save to `generation_jobs` table:
     - Prompt used
     - AI model/provider
     - Generation timestamp
     - Token usage
     - Cost (if applicable)

10. **Create Audit Log**
    - Log `POST_GENERATED` event

11. **Return Response**
    - Return post with all variants

---

## Response

**Success (201 Created):**
```json
{
  "id": "post-uuid-generated",
  "title": "Product Launch Announcement",
  "status": "draft",
  "created_at": "2025-11-25T15:30:00Z",
  "created_via": "ai_generation",
  "variants": [
    {
      "id": "variant-x-1",
      "channel_id": "x-channel-uuid",
      "content": "🚀 Exciting news! Our new real-time collaboration feature launches next week - completely free for all users!\n\n#Productivity #Collaboration",
      "status": "draft",
      "metadata": {
        "hashtags": ["#Productivity", "#Collaboration"],
        "ai_confidence": 0.92
      },
      "validation": {
        "character_count": 142,
        "character_limit": 280,
        "is_valid": true
      }
    },
    {
      "id": "variant-x-2",
      "channel_id": "x-channel-uuid",
      "content": "Big announcement for small business owners: Real-time collaboration is coming next week! Best part? It's free for everyone. 🎉\n\n#SmallBusiness #TeamWork",
      "status": "draft",
      "metadata": {
        "hashtags": ["#SmallBusiness", "#TeamWork"],
        "ai_confidence": 0.89
      },
      "validation": {
        "character_count": 175,
        "character_limit": 280,
        "is_valid": true
      }
    },
    {
      "id": "variant-linkedin-1",
      "channel_id": "linkedin-channel-uuid",
      "content": "We're thrilled to announce our latest feature: Real-time Collaboration!\n\nStarting next week, small business owners can:\n✓ Work together seamlessly\n✓ Edit documents simultaneously\n✓ See changes in real-time\n\nBest of all? This powerful feature is completely free for all users.\n\nReal-time collaboration isn't just about working faster - it's about working smarter. Our research shows teams using collaborative tools are 30% more productive.\n\nReady to transform how your team works? The feature rolls out next week.\n\n#Collaboration #Productivity #SmallBusiness #TeamWork",
      "status": "draft",
      "metadata": {
        "hashtags": ["#Collaboration", "#Productivity", "#SmallBusiness", "#TeamWork"],
        "ai_confidence": 0.95
      },
      "validation": {
        "character_count": 573,
        "character_limit": 3000,
        "is_valid": true
      }
    }
  ],
  "generation_metadata": {
    "template_id": "template-uuid-456",
    "ai_model": "gpt-4",
    "generation_time_ms": 2341,
    "tokens_used": 856,
    "variants_generated": 3
  }
}
```

**Error (400 Bad Request) - Invalid context:**
```json
{
  "errors": [
    {
      "error_code": "INVALID_GENERATION_CONTEXT",
      "error_description": "Topic is required for content generation",
      "error_severity": "error"
    }
  ]
}
```

**Error (429 Too Many Requests) - Rate limit:**
```json
{
  "errors": [
    {
      "error_code": "GENERATION_RATE_LIMIT_EXCEEDED",
      "error_description": "You have reached the maximum number of AI generations per hour. Please try again later.",
      "error_severity": "error",
      "meta": {
        "limit": 10,
        "reset_at": "2025-11-25T16:00:00Z"
      }
    }
  ]
}
```

**Error (503 Service Unavailable) - AI service down:**
```json
{
  "errors": [
    {
      "error_code": "AI_SERVICE_UNAVAILABLE",
      "error_description": "Content generation service is temporarily unavailable. Please try again later.",
      "error_severity": "error"
    }
  ]
}
```

---

## AI Prompt Structure

**System Prompt:**
```
You are a professional social media content creator. Generate engaging post content that:
- Matches the specified tone and style
- Respects character limits for each platform
- Includes relevant hashtags when requested
- Is clear, concise, and actionable
- Avoids controversial topics
- Follows best practices for each platform
```

**User Prompt Example:**
```
Topic: Product Launch
Tone: Professional
Target Audience: Small business owners

Key Points:
- New feature: Real-time collaboration
- Available starting next week
- Free for all users

Generate 2 variants for X (Twitter) (max 280 chars) and 1 variant for LinkedIn (max 3000 chars).
Include relevant hashtags.
```

---

## Rate Limiting

**User Limits:**
- Free tier: 10 generations per hour
- Pro tier: 100 generations per hour
- Enterprise: Unlimited

**Implementation:**
```javascript
// Check rate limit
const key = `generation:limit:${principal_id}`;
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 3600); // 1 hour
}
if (count > user.generation_limit) {
  throw new RateLimitError();
}
```

---

## Cost Tracking

**Store generation costs:**
```javascript
{
  generation_id: 'gen-uuid',
  principal_id: 'user-uuid',
  ai_provider: 'openai',
  model: 'gpt-4',
  tokens_used: 856,
  cost_usd: 0.0428, // Based on token pricing
  timestamp: '2025-11-25T15:30:00Z'
}
```

**Monthly reporting:**
- Track total AI costs per user
- Monitor usage patterns
- Optimize prompts to reduce costs

---

## Template Integration

**Template Structure:**
```json
{
  "id": "template-uuid",
  "name": "Product Launch Template",
  "prompt_template": "Create a {tone} announcement about {topic}. Key points: {key_points}. Target audience: {target_audience}.",
  "default_options": {
    "include_hashtags": true,
    "tone": "professional"
  }
}
```

**Merging with User Context:**
```javascript
const prompt = template.prompt_template
  .replace('{tone}', context.tone)
  .replace('{topic}', context.topic)
  .replace('{key_points}', context.key_points.join(', '))
  .replace('{target_audience}', context.target_audience);
```

---

## Authorization

- Requires valid user JWT token
- Service accounts can generate content with appropriate permissions
- Rate limits apply per principal_id

---

## Future Enhancements

- **Image Generation**: Generate images using DALL-E or Midjourney
- **Scheduling Suggestions**: AI suggests optimal posting times
- **Hashtag Research**: AI recommends trending hashtags
- **Competitor Analysis**: Analyze competitor posts for insights
- **Performance Prediction**: Predict engagement before posting
