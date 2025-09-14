# Cluster Aggregation - Pending Fans Only

## Problem
Previously, clusters would show ALL fans (both pending and answered) in the aggregated view, but the cluster status was based on the first document only. This caused issues:
- If the first document was 'answered', the entire cluster appeared answered
- Creators couldn't see which fans still needed responses
- Mixed status clusters were incorrectly hidden or shown

## Solution
Clusters now aggregate and display ONLY pending fans, filtering out already-answered ones.

## Implementation

### Before (Incorrect)
```javascript
// Used ALL documents regardless of status
docs.forEach(doc => {
  allFanIds.add(doc.fanId);
  allAffectedChats.add(chat);
});
// Status from first document (could be wrong)
status: baseDoc.status
```

### After (Fixed)
```javascript
// Separate pending from answered
const pendingDocs = docs.filter(doc => doc.status === 'pending');
const answeredDocs = docs.filter(doc => doc.status === 'answered');

// Skip if no pending fans
if (pendingDocs.length === 0) {
  return; // Don't create cluster
}

// Aggregate ONLY pending fans
pendingDocs.forEach(doc => {
  pendingFanIds.add(doc.fanId);
  pendingAffectedChats.add(chat);
});

// Always 'pending' status
status: 'pending'
fanCount: pendingFanIds.size // Only pending fans
```

## Benefits

### Accurate Display
- Shows only fans who need responses
- Fan count reflects actual pending fans
- Clusters disappear when fully answered

### Better UX
- No confusion about mixed status clusters
- Clear indication of work remaining
- Automatic cleanup as fans are answered

## Example Scenario

### Cluster with 5 Fans
```
Document 1: Fan A - Status: answered ❌ (excluded)
Document 2: Fan B - Status: pending ✅ (included)
Document 3: Fan C - Status: answered ❌ (excluded)
Document 4: Fan D - Status: pending ✅ (included)
Document 5: Fan E - Status: pending ✅ (included)
```

### Result
- **Display**: "3 FANS" (only B, D, E)
- **Status**: "pending"
- **Affected Chats**: Only chats for B, D, E
- **When B, D, E answered**: Cluster disappears

## Edge Cases Handled

1. **All Answered**: Cluster not shown at all
2. **Mixed Status**: Only pending fans shown
3. **One-by-One**: Updates individual status correctly
4. **Answer for All**: Updates all pending at once

## Testing Checklist

- [ ] Create cluster with 3 fans
- [ ] Answer 1 fan via one-by-one
- [ ] Verify cluster shows "2 FANS"
- [ ] Answer remaining fans
- [ ] Verify cluster disappears
- [ ] Mixed status clusters display correctly

## Future Enhancements

Consider:
1. Show answered count somewhere (e.g., "3 pending, 2 answered")
2. Option to view answered clusters
3. Progress indicator for partially completed clusters
4. Archive view for fully answered clusters
