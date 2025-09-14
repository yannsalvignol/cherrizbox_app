# Quote Removal Fix for Personalized Messages

## Problem
Messages were being sent with quotes around them, appearing as:
```
"Your personalized message here"
```

## Solution
Implemented multiple safeguards to ensure quotes are removed:

### 1. AI Response Cleanup
```javascript
const content = completion.choices[0]?.message?.content || canonicalAnswer;
// Remove surrounding quotes if the AI added them
return content.replace(/^["']|["']$/g, '').trim();
```

### 2. Fallback Cleanup
```javascript
// Fallback to canonical answer (ensure no quotes)
return canonicalAnswer.replace(/^["']|["']$/g, '').trim();
```

### 3. Final Cleanup Before Sending
```javascript
// Final cleanup: ensure no surrounding quotes
personalizedMessage = personalizedMessage.replace(/^["']|["']$/g, '').trim();
```

### 4. System Prompt Update
Added explicit instructions to the AI:
- "DO NOT wrap your response in quotes - return the plain text message"
- "Return ONLY the adapted message text, no quotes or formatting"

## Regex Explanation
The pattern `/^["']|["']$/g` removes:
- `^["']` - Single or double quotes at the beginning
- `["']$` - Single or double quotes at the end
- `g` flag - Global replacement (all occurrences)

## Testing
To verify the fix:
1. Send a test "Answer for All"
2. Check Stream Chat messages - should have no surrounding quotes
3. Test with various canonical answers that might contain quotes

## Edge Cases Handled
- Double quotes: `"message"` → `message`
- Single quotes: `'message'` → `message`
- Mixed quotes: `"message'` → `message`
- No quotes: `message` → `message` (unchanged)
- Internal quotes preserved: `It's a "test"` → `It's a "test"`
