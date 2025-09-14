# Appwrite Collections Explained

## Collections Used in Answer for All Feature

### 1. **Clusters Collection** (`APPWRITE_CLUSTERS_COLLECTION_ID`)
**Default ID**: `clusters`

**Purpose**: Stores grouped questions from fans that are similar

**Used for**:
- Reading cluster documents to get question details
- Extracting `fullMessage` for context during adaptation
- Saving canonical answers
- Updating cluster status (pending → processing → answered)
- Tracking which chats are affected

**Attributes**:
- `clusterId` - Unique identifier for the cluster
- `proId` - Creator/Pro user ID
- `fanId` - Fan ID(s) involved
- `title` - Question title/summary
- `fullMessage` - Original full question (CRITICAL for context adaptation)
- `representativeQuestions` - JSON array of similar questions
- `affectedChats` - JSON array of chat IDs to send to
- `status` - Current status (pending/processing/answered)
- `canonicalAnswer` - The answer written by the creator
- `AICanonicalAnswer` - The AI-adapted/personalized answer sent to the fan
- `$createdAt` - When cluster was created
- `$updatedAt` - Last update time

### 2. **Creator Collection** (`EXPO_PUBLIC_APPWRITE_CREATOR_COLLECTION_ID`)
**Default ID**: `creators`

**Purpose**: Stores creator profiles with Stream Chat authentication tokens

**Used for**:
- Fetching pre-generated Stream Chat tokens
- Avoiding the need to generate tokens on each message send

**Attributes used**:
- `creatoraccountid` - Creator's unique ID
- `streamChatToken` - Pre-generated Stream Chat authentication token

## Environment Variables Summary

### Backend Function Needs:
```bash
# Database and collections
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_CLUSTERS_COLLECTION_ID=clusters  # Cluster documents
EXPO_PUBLIC_APPWRITE_CREATOR_COLLECTION_ID=creators  # Creator profiles

# API access
APPWRITE_API_KEY=your_api_key_with_permissions

# External services
OPENAI_API_KEY=sk-your-key              # GPT-4o-mini for adaptation
STREAM_CHAT_API_KEY=xzrue5uj6btx       # Stream Chat
STREAM_CHAT_SECRET=your_secret         # Optional if using stored tokens
```

### Frontend Needs:
```bash
# Just the function ID
EXPO_PUBLIC_ANSWER_FOR_ALL_FUNCTION_ID=answer-for-all
```

## Data Flow

```
1. Frontend sends clusterId to backend function
   ↓
2. Backend reads from CLUSTERS collection
   - Gets canonical answer (for tone reference)
   - Gets fullMessage (for context)
   - Gets affected chat IDs
   ↓
3. For each affected chat:
   - Extract fanId from chat ID
   - Use GPT-4o-mini to adapt message:
     * Analyze canonical answer tone
     * Apply context from fullMessage
     * Maintain tone while addressing context
   - Send via Stream Chat
   ↓
4. Update CLUSTERS collection
   - Mark as 'answered'
   - Save timestamp
```

## Example Document

**Cluster Document**:
```json
{
  "clusterId": "cluster_1234",
  "proId": "creator123",
  "fanId": "fan456,fan789",
  "affectedChats": "[\"dm-creator123-fan456\", \"dm-creator123-fan789\"]",
  "title": "How to get started?",
  "fullMessage": "I'm new and confused about where to begin with the workout program",
  "canonicalAnswer": "Start with 3 sets of 10 reps for each exercise.",
  "status": "pending"
}
```

**Adaptation Process**:
1. Canonical: "Start with 3 sets of 10 reps for each exercise."
2. Context from fullMessage: User is new and confused
3. Adapted: "Since you're new to the program, start with 3 sets of 10 reps for each exercise."

### Why Store Stream Tokens?

1. **Security**: Tokens are pre-generated and stored securely
2. **Performance**: No need to generate tokens on each message
3. **Flexibility**: Can work without Stream Secret in some environments
4. **Fallback**: System tries stored token first, then generates if needed

## Why This Approach?

### Tone Consistency
- Creator's voice is preserved
- Professional/casual tone maintained
- Brand consistency across all messages

### Context Awareness
- Addresses specific fan concerns
- Adapts to knowledge level
- Recognizes urgency or confusion

### Minimal Changes
- 75%+ of canonical answer preserved
- No unnecessary rewrites
- Efficient and cost-effective

## Key Points

1. **No User Collection Needed** - We don't fetch fan names
2. **Creator Collection** - Provides Stream Chat tokens
3. **fullMessage is Critical** - Provides context for adaptation
4. **Tone Matching** - AI analyzes and maintains canonical tone
5. **Batch Processing** - Efficiently handles multiple fans
6. **Fallback Safety** - Returns canonical if adaptation fails