# GPT-4o-mini Tone & Context Adaptation Engine Setup

## Overview
The AI adaptation engine uses OpenAI's GPT-4o-mini model to adapt canonical answers based on the fan's original message context while maintaining the tone and style of the canonical answer. **All processing happens securely in the backend via an Appwrite Function** - no API keys are exposed to the client.

## Setup Instructions

### 1. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)

### 2. Configure Backend Function

#### Add to Appwrite Function Environment Variables:
In Appwrite Console → Functions → Answer for All → Settings → Variables:

```bash
# OpenAI Configuration (BACKEND ONLY - Never expose to client)
OPENAI_API_KEY=sk-your-actual-api-key-here

# Database Configuration
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_CLUSTERS_COLLECTION_ID=clusters  # For cluster data and context
EXPO_PUBLIC_APPWRITE_CREATOR_COLLECTION_ID=creators  # For Stream tokens
APPWRITE_API_KEY=your_api_key

# Stream Chat Configuration
STREAM_CHAT_API_KEY=xzrue5uj6btx
STREAM_CHAT_SECRET=your_stream_secret  # Optional if using stored tokens
```

#### Add to Frontend `.env`:
```bash
# Function ID for Answer for All
EXPO_PUBLIC_ANSWER_FOR_ALL_FUNCTION_ID=answer-for-all
```

### 3. How It Works

#### Tone-Aware Context Adaptation Process
1. **Creator writes canonical answer** - Sets the tone and complete response structure
2. **System analyzes context** from the fan's original message (`fullMessage`)
3. **AI adapts minimally** (preserves 75%+ of original):
   - Maintains the exact tone of the canonical answer
   - Addresses specific context from fan's message
   - Slightly expands on relevant points
   - NO greetings or names added
   - NO major restructuring
4. **GPT-4o-mini focuses on**:
   - Tone consistency (formal, casual, technical, friendly)
   - Context relevance from fullMessage
   - Minimal structural changes
   - Natural flow preservation

#### Example Transformations (Tone & Context Focus)

**Example 1 - Technical Tone Preservation:**
- Fan Context: "I'm confused about the API endpoints and keep getting errors"
- Canonical: "Check your authentication headers and ensure the API key is properly formatted."
- Adapted: "Since you're getting errors, check your authentication headers and ensure the API key is properly formatted. Common issues include missing Bearer prefix or incorrect encoding."
- **Tone maintained: Technical, direct**

**Example 2 - Casual Tone with Context:**
- Fan Context: "I'm a beginner and overwhelmed by all the workout options"
- Canonical: "Just pick any routine and stick with it for 4 weeks."
- Adapted: "Since you're feeling overwhelmed, just pick any routine and stick with it for 4 weeks. Starting is more important than finding the perfect plan."
- **Tone maintained: Casual, encouraging**

**Example 3 - Formal Tone with Urgency:**
- Fan Context: "I need to submit my tax documents today but the form isn't working"
- Canonical: "The form submission process requires all fields to be completed in the specified format."
- Adapted: "Given your deadline, please ensure the form submission process has all fields completed in the specified format. The system validates each field before allowing submission."
- **Tone maintained: Formal, procedural**

### 4. Cost Estimation

GPT-4o-mini pricing (as of 2024):
- **Input**: $0.15 per 1M tokens (~750k words)
- **Output**: $0.60 per 1M tokens (~750k words)

Average adaptation:
- Input: ~350 tokens per message (includes context)
- Output: ~150 tokens per message
- **Cost per message**: ~$0.0001 (0.01 cents)

For 1000 fans receiving adapted messages:
- **Total cost**: ~$0.10 (10 cents)

### 5. Fallback Behavior

If OpenAI API is not configured or fails:
- System returns canonical answer as-is
- No adaptation performed
- Still functional, just without context adaptation

### 6. Testing the Integration

1. **Without API Key** (Pass-through Mode):
   - Don't set `OPENAI_API_KEY` in Appwrite function
   - System will return canonical answer unchanged
   - Good for testing message delivery

2. **With API Key** (Adaptation Mode):
   - Add OpenAI API key to Appwrite function environment
   - Deploy/restart the function
   - Create test clusters with varied contexts
   - Check Appwrite function logs for adaptation details

### 7. Advanced Configuration

#### Custom System Prompts
Modify the system prompt in `canonical_answers/src/main.js` to adjust behavior:

```javascript
const systemPrompt = `You are an AI assistant that adapts responses to match tone and address specific context.
ANALYZE the tone of the canonical answer and MAINTAIN it throughout.
PRESERVE 75%+ of the canonical answer's structure.
// Add your custom instructions here
`;
```

#### Temperature Settings
- `0.0` - Deterministic, identical output every time
- `0.3` - Minimal variation (default) - preserves structure
- `0.5` - Moderate variation (may alter tone)
- Higher values will cause unwanted tone shifts

### 8. Monitoring & Debugging

Enable debug logs to see adaptation details:

```javascript
// In canonical_answers/src/main.js
log('🤖 [AI] Original context:', fullMessage);
log('🤖 [AI] Adapted message:', personalizedMessage);
```

### 9. Rate Limits

OpenAI Tier 1 (Free tier):
- 3 RPM (requests per minute)
- 200 RPD (requests per day)
- 40,000 TPM (tokens per minute)

The system handles rate limiting with:
- Sequential processing
- Automatic retries with fallback
- Graceful degradation to canonical answer

### 10. Security Notes

- **API keys are ONLY in backend** - Never expose to client
- OpenAI key is stored in Appwrite function environment
- Frontend only triggers the function, never sees the key
- Monitor usage in OpenAI dashboard
- Set usage limits in OpenAI settings
- Use Appwrite API key with minimal required permissions

## Best Practices

### Writing Canonical Answers
1. **Establish clear tone** - Be consistent (formal, casual, technical)
2. **Complete thoughts** - Answer should stand alone
3. **Structure matters** - AI will preserve your structure
4. **Avoid placeholders** - Write the full answer

### Context Utilization
The AI uses the `fullMessage` attribute from clusters to:
- Understand the fan's knowledge level
- Identify specific pain points
- Recognize urgency or confusion
- Adapt terminology appropriately

### Tone Categories
The AI recognizes and maintains these tones:
- **Technical**: Precise, detailed, terminology-heavy
- **Casual**: Friendly, conversational, relaxed
- **Formal**: Professional, structured, proper
- **Encouraging**: Supportive, motivational, positive
- **Direct**: Brief, to-the-point, action-oriented

## Troubleshooting

### API Key Not Working
- Check key starts with `sk-`
- Verify key is active in OpenAI dashboard
- Ensure function environment variables are saved

### Adaptation Not Happening
- Check function logs for `[AI]` messages
- Verify `OPENAI_API_KEY` is set in function
- Look for error messages in Appwrite logs

### Rate Limit Errors
- Add delays between messages
- Upgrade OpenAI tier for higher limits
- Consider caching common adaptations

### Tone Not Matching
- Lower temperature setting (0.2-0.3)
- Review canonical answer tone consistency
- Check system prompt configuration

### Want Different Adaptation Level
- Modify the 75% preservation rule in system prompt
- Adjust temperature for more/less variation
- Consider different context extraction approach