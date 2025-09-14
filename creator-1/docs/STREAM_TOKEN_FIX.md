# Stream Chat Token Fix

## Problem
The error "tokens can only be created server-side using the API Secret" was occurring because Stream Chat requires the API Secret to generate tokens server-side.

## Solution
We now use a hybrid approach:

### 1. Primary Method: Pre-stored Tokens
- Fetch the creator's Stream Chat token from the creator collection
- Token is stored in `streamChatToken` attribute
- Creator identified by `creatoraccountid` attribute

### 2. Fallback Method: Generate Token
- If no stored token found, generate one using the API Secret
- Requires `STREAM_CHAT_SECRET` environment variable

## Implementation

```javascript
// Get creator's Stream Chat token from database
async function getCreatorStreamToken(databases, creatorId) {
  // First, try to get stored token from creator collection
  const creatorDocs = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID,
    process.env.EXPO_PUBLIC_APPWRITE_CREATOR_COLLECTION_ID || 'creators',
    [Query.equal('creatoraccountid', creatorId), Query.limit(1)]
  );
  
  if (creatorDocs.documents.length > 0 && creatorDocs.documents[0].streamChatToken) {
    return creatorDocs.documents[0].streamChatToken;
  }
  
  // Fallback: create token if we have the secret
  if (process.env.STREAM_CHAT_SECRET) {
    return streamClient.createToken(creatorId);
  }
  
  throw new Error('No Stream Chat token found and cannot create one');
}
```

## Required Environment Variables

```bash
# For fetching stored tokens
EXPO_PUBLIC_APPWRITE_CREATOR_COLLECTION_ID=creators

# Optional if tokens are pre-stored
STREAM_CHAT_SECRET=your_secret_key
```

## Benefits

1. **Flexibility**: Works with or without Stream Secret
2. **Security**: Tokens can be pre-generated and stored
3. **Performance**: No need to generate tokens on each request
4. **Reliability**: Fallback ensures backward compatibility

## Creator Collection Schema

The creator collection must have:
- `creatoraccountid`: String - The creator's unique ID
- `streamChatToken`: String - Pre-generated Stream Chat token

## Generating Tokens for Storage

If you need to pre-generate tokens for storage:

```javascript
// One-time token generation
const token = streamClient.createToken(creatorId);
// Store this token in the creator's document
```

## Testing

1. **With stored token**: Ensure creator document has `streamChatToken`
2. **Without stored token**: Provide `STREAM_CHAT_SECRET` for fallback
3. **Error case**: Remove both to verify error handling
