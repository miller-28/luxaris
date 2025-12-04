
# Luxaris API – Generation Domain

This document describes the **Generation domain**: AI-powered content creation, templates, generation sessions, and multi-variant suggestion workflows.

---

## 1. Overview

Content Generation provides:

- Reusable post templates with placeholders
- AI-powered content suggestions
- Multi-variant generation for different channels
- Generation session tracking and history

---

## 2. Post Template

**PostTemplate** helps define reusable patterns for content generation.

### 2.1 Fields

- `id` – UUID.
- `owner_principal_id`.
- `name` – e.g. `"launch_announce_short"`.
- `description`.
- `template_body` – text with placeholders (e.g. `"New feature: {{feature}} is live..."`).
- `default_channel_id` – optional default target.
- `constraints` – JSON (max length, tone presets, etc).
- `created_at`, `updated_at`.

### 2.2 Purpose

Templates serve as:
- **Starting points** for manual content creation
- **Input to AI generation** for consistent messaging
- **Reusable patterns** across campaigns

### 2.3 Template Body Format

Uses placeholder syntax for variable substitution:

```
New feature alert! 🚀

{{feature_name}} is now live. {{description}}

Learn more: {{url}}

#{{campaign_tag}}
```

### 2.4 Constraints Format

The `constraints` JSON defines generation parameters:

```json
{
  "max_length": 280,
  "tone": ["professional", "excited", "casual"],
  "include_emoji": true,
  "include_hashtags": true,
  "call_to_action": "Learn more"
}
```

---

## 3. Generation Session

**GenerationSession** groups multiple AI generations around a single intent.

### 3.1 Fields

- `id` – UUID.
- `owner_principal_id`.
- `post_id` – optional link to a Post.
- `template_id` – optional link to PostTemplate.
- `prompt` – high-level request ("announce our new feature x in dark, sharp tone").
- `status` – `in_progress | completed | aborted`.
- `created_at`, `updated_at`.

### 3.2 Purpose

Sessions provide:
- **Grouping** of related generation attempts
- **History** of AI interactions
- **Context** for suggestions

---

## 4. Generation Suggestion

**GenerationSuggestion** captures each generated candidate.

### 4.1 Fields

- `id` – UUID.
- `generation_session_id`.
- `channel_id` – target channel considered.
- `content` – proposed text.
- `score` – optional numeric quality score / ranking.
- `accepted` – boolean (if user promoted it to a PostVariant).
- `created_at`.

### 4.2 Purpose

Suggestions represent:
- **AI-generated alternatives** for user to choose from
- **Channel-specific variations** of same idea
- **Ranked options** by quality/relevance

---

## 5. Workflows

### 5.1 Create Template

Flow:

1. User creates template with:
   - Name and description
   - Template body with placeholders
   - Optional constraints

2. Application validates and stores template.

3. Template available for future generations.

### 5.2 Generate Post Suggestions

Flow:

1. User specifies:
   - High-level prompt / description
   - Optional template reference
   - Target channel(s)
   - Tone/length hints

2. Application creates `GenerationSession` with `status = in_progress`.

3. For each target channel:
   - Calls generator adapter in infrastructure (e.g., AI API)
   - Applies channel-specific limits (truncate, reword)
   - Stores each proposal as `GenerationSuggestion`
   - Optionally scores suggestions by quality

4. Updates session `status = completed`.

5. User fetches suggestions via API.

### 5.3 Accept Suggestion

Flow:

1. User selects preferred suggestion from session.

2. Application:
   - Marks `GenerationSuggestion.accepted = true`.
   - Creates `PostVariant` with suggestion content:
     - If `post_id` exists in session, links to that Post.
     - Otherwise, creates new `Post` and sets `base_content` from suggestion.
   - Returns created variant/post to user.

3. Rejected suggestions remain for reference but not used.

### 5.4 Manual Template Usage

Flow:

1. User selects template.

2. Provides values for placeholders:
   ```json
   {
     "feature_name": "Dark Mode",
     "description": "Switch themes instantly",
     "url": "https://example.com/dark-mode",
     "campaign_tag": "FeatureLaunch"
   }
   ```

3. Application substitutes placeholders in template body.

4. Returns rendered content as starting point for Post/Variant.

---

## 6. AI Generation Process

### 6.1 Generator Adapter

Infrastructure component that interfaces with AI services:

**Interface:**
```javascript
generateContent(params) {
  // params: prompt, channel, constraints, template
  // returns: array of suggestions with content and score
}
```

**Implementation options:**
- OpenAI GPT API
- Anthropic Claude API
- Local models
- Custom fine-tuned models

### 6.2 Generation Parameters

Sent to AI service:

- **System prompt** – "You are a social media content generator..."
- **User prompt** – User's high-level request
- **Context** – Template body (if used), channel constraints
- **Output format** – Structured JSON with content + metadata

### 6.3 Post-Processing

After receiving AI response:

1. **Validation** – Ensure content meets channel limits
2. **Truncation** – Cut to max length if needed
3. **Formatting** – Apply channel-specific rules (hashtags, mentions, etc.)
4. **Scoring** – Optional quality assessment
5. **Storage** – Save as suggestions in session

---

## 7. Generation History

Users can view past generation sessions:

**Use-case:** `listGenerationSessions(principal, filters)`

Returns sessions with:
- Original prompt
- Template used (if any)
- Suggestions generated
- Which suggestions were accepted
- Resulting posts/variants

Useful for:
- Learning what works
- Reusing successful prompts
- Tracking AI usage

---

## 8. Constraints & Rules

**Template Ownership**
- Only owner or permitted team members can edit templates
- Templates can be shared across team

**Generation Limits**
- Rate limiting on AI API calls (cost management)
- Maximum suggestions per session (e.g., 5-10)
- Cooldown period between generations

**Content Validation**
- Generated content must pass same validation as manual content
- Platform policy violations detected and flagged
- User always reviews before accepting

**AI Service Availability**
- Graceful degradation if AI service unavailable
- Fallback to template-only mode
- Error messages guide user to manual creation

---

## 9. Summary

Key entities:

- `post_templates` – Reusable content patterns
- `generation_sessions` – AI generation attempts
- `generation_suggestions` – AI-generated candidates

These enable AI-assisted content creation while maintaining user control and quality standards.
