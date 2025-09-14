# AICanonicalAnswer Attribute Update

## Overview
After successfully sending a personalized message to a fan, the system now stores the AI-adapted version in the `AICanonicalAnswer` attribute of the cluster document.

## Purpose
- **Audit Trail**: Keep a record of what was actually sent to each fan
- **Quality Review**: Allow creators to see how their answers were adapted
- **Analytics**: Compare canonical vs personalized versions
- **Debugging**: Troubleshoot any adaptation issues

## Implementation

### When It's Updated
The `AICanonicalAnswer` field is updated:
1. After successful message sending via Stream Chat
2. For each fan's specific cluster document
3. Only if the message was successfully delivered

### Code Logic
```javascript
// After successful send
if (sent) {
  // Find the cluster document for this specific fan
  const fanClusterDoc = clusterDocs.documents.find(doc => 
    doc.fanId === fanId || doc.fanId.includes(fanId)
  );
  
  if (fanClusterDoc) {
    await databases.updateDocument(
      databaseId,
      clustersCollectionId,
      fanClusterDoc.$id,
      {
        AICanonicalAnswer: personalizedMessage
      }
    );
  }
}
```

## Database Schema
Each cluster document now has:
- `canonicalAnswer`: Original answer from creator
- `AICanonicalAnswer`: AI-adapted version actually sent
- `status`: Processing status
- `answeredAt`: Timestamp when answered

## Benefits

### For Creators
- See exactly what was sent to each fan
- Verify AI adaptation quality
- Learn from successful adaptations

### For System
- Complete message history
- Debugging capabilities
- Quality assurance metrics

## Example Document
```json
{
  "clusterId": "cluster_1234",
  "fanId": "fan456",
  "canonicalAnswer": "Start with 3 sets of 10 reps.",
  "AICanonicalAnswer": "Since you're new to the program, start with 3 sets of 10 reps to build a foundation.",
  "status": "answered",
  "answeredAt": "2024-01-15T10:30:00Z"
}
```

## Error Handling
- Updates are wrapped in try-catch
- Failures don't stop the message sending process
- Warnings are logged but not fatal
- Main process continues even if update fails

## Future Enhancements
Consider using this data for:
1. **Adaptation Analytics**: Measure how much AI changes answers
2. **Tone Consistency**: Verify tone preservation across adaptations
3. **Feedback Loop**: Use successful adaptations to improve prompts
4. **Creator Insights**: Show adaptation patterns to creators
