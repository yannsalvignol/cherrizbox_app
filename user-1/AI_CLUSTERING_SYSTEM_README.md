# AI-Powered Fan-Out Messaging System

A Telegram-like chat application with intelligent message clustering and personalized response generation for creator-fan interactions.

## Overview

This system enables creators (Pros) to efficiently manage hundreds of fan messages by automatically clustering similar questions and generating personalized responses from a single canonical answer.

### Key Features

- **Intent Recognition**: Parses complex messages into individual questions using GPT-4o-mini
- **Multi-Question Processing**: Handles fans asking multiple questions in a single message
- **Intelligent Clustering**: Groups similar questions by topic using focused semantic embeddings
- **Canonical Answers**: Pros write one comprehensive answer per cluster
- **Personalized Fan-Out**: AI generates personalized replies for each fan based on their chat history and the canonical answer
- **Conflict Resolution**: Detects and handles contradictions between canonical answers and fan context
- **Real-time Dashboard**: Pro interface for cluster management and response oversight

## Architecture

```
Fan Messages → Intent Recognition → Focused Embeddings → Clustering Engine → Pro Dashboard → Canonical Answer → Personalization Engine → Fan Replies
```

### Tech Stack

- **Frontend**: React Native + Expo
- **Chat**: Stream Chat
- **Backend**: Appwrite
- **Vector DB**: Upstash Vector
- **Embeddings**: OpenAI text-embedding-3-small
- **LLM**: OpenAI GPT-4o (canonical) / GPT-4o-mini (personalization)
- **Orchestration**: LangChain

## Data Models

### 1:1 Chat
```typescript
interface Chat {
  id: string;
  userId: string;
  creatorId: string;
  messages: Message[];
  metadata: {
    tags: string[];
    totalSpend: number;
    lastReplyState: 'pending' | 'answered' | 'needs_followup';
  };
  clusterId?: string;
}
```

### Message Cluster
```typescript
interface MessageCluster {
  id: string;
  title: string;
  topic: string;
  affectedChats: string[];
  representativeQuestions: string[];
  canonicalAnswer?: string;
  status: 'pending' | 'answered' | 'processing';
  createdAt: Date;
  updatedAt: Date;
}
```

### Canonical Answer
```typescript
interface CanonicalAnswer {
  id: string;
  clusterId: string;
  content: string;
  tone: ToneProfile;
  createdBy: string;
  createdAt: Date;
}
```

### Personalized Reply
```typescript
interface PersonalizedReply {
  id: string;
  chatId: string;
  canonicalAnswerId: string;
  content: string;
  confidence: number;
  conflicts?: string[];
  status: 'draft' | 'sent' | 'needs_review';
}
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Basic clustering infrastructure

#### Week 1: Vector Database Setup
- [ ] Set up Upstash Vector database
- [ ] Create embedding generation service
- [ ] Implement basic similarity search
- [ ] Test with sample messages

**Deliverables**:
- Upstash Vector instance configured
- Message embedding service
- Basic similarity search functionality

#### Week 2: Core Clustering
- [ ] Build clustering algorithm
- [ ] Create cluster management API
- [ ] Implement cluster creation/merging logic
- [ ] Add basic Pro dashboard

**Deliverables**:
- Working clustering system
- REST API for cluster operations
- Basic React Native dashboard

### Phase 2: Intelligence Layer (Weeks 3-4)

#### Week 3: Intent Recognition (Pre-Embedding)
- [ ] Integrate LangChain with GPT-4o-mini
- [ ] Build multi-question detection and parsing
- [ ] Implement intent tagging system
- [ ] Add topic classification
- [ ] Integrate with embedding pipeline

**Deliverables**:
- Multi-question parsing (before embedding)
- Intent classification system
- Topic-aware clustering
- Improved embedding quality

#### Week 4: Advanced Clustering
- [ ] Dynamic cluster merging/splitting
- [ ] Outlier detection system
- [ ] Manual review queue
- [ ] Cluster analytics
- [ ] Quality scoring with higher thresholds

**Deliverables**:
- Intelligent cluster management
- Outlier detection pipeline
- Analytics dashboard
- Higher accuracy clustering (85%+ similarity)

### Phase 3: Personalization Engine (Weeks 5-7)

#### Week 5: Tone Extraction
- [ ] Build tone analysis system
- [ ] Create tone profile storage
- [ ] Implement tone consistency checks
- [ ] Add tone drift detection

**Deliverables**:
- Tone extraction service
- Tone profile management
- Consistency monitoring

#### Week 6: Reply Generation
- [ ] Build personalization engine
- [ ] Implement context-aware generation
- [ ] Add conflict detection
- [ ] Create preview system

**Deliverables**:
- Personalized reply generation
- Conflict resolution system
- Pro preview interface

#### Week 7: Quality Assurance
- [ ] Implement coherence checking
- [ ] Add batch processing
- [ ] Build confidence scoring
- [ ] Create A/B testing framework

**Deliverables**:
- Quality assurance pipeline
- Batch processing system
- Testing framework

### Phase 4: Production Features (Weeks 8-10)

#### Week 8: Performance Optimization
- [ ] Implement caching strategies
- [ ] Add rate limiting
- [ ] Optimize API calls
- [ ] Database indexing

**Deliverables**:
- Optimized performance
- Scalable architecture
- Cost optimization

#### Week 9: Monitoring & Analytics
- [ ] Add comprehensive logging
- [ ] Build analytics dashboard
- [ ] Implement alerting system
- [ ] Create performance metrics

**Deliverables**:
- Monitoring system
- Analytics platform
- Alert infrastructure

#### Week 10: Launch Preparation
- [ ] End-to-end testing
- [ ] Security audit
- [ ] Performance testing
- [ ] Documentation completion

**Deliverables**:
- Production-ready system
- Security validation
- Complete documentation

### Phase 5: Advanced Features (Weeks 11+)

#### Future Enhancements
- [ ] Multi-language support
- [ ] Voice message clustering
- [ ] Image/media clustering
- [ ] Advanced personalization (fan preferences)
- [ ] Integration with other platforms
- [ ] Mobile app optimizations

## Technical Implementation Details

### Clustering Algorithm

```typescript
class MessageClusteringService {
  private readonly SIMILARITY_THRESHOLD = 0.85;
  private readonly MANUAL_REVIEW_THRESHOLD = 0.7;

  async processMessage(message: Message, chatId: string, chatHistory: Message[]): Promise<string[]> {
    // 1. Parse intent and extract individual questions FIRST
    const intentAnalysis = await this.intentRecognizer.analyzeMessage(
      message.content, 
      chatHistory
    );
    
    const results = [];
    
    // 2. Process each question separately with focused embeddings
    for (const question of intentAnalysis.questions) {
      // Generate embedding for the clean, focused question
      const embedding = await this.generateEmbedding(question);
      
      // Find similar clusters with higher accuracy
      const similarClusters = await this.findSimilarClusters(embedding, intentAnalysis.topic);
      
      // Assign to cluster or create new one (higher thresholds due to better accuracy)
      if (similarClusters.length > 0 && similarClusters[0].score > this.SIMILARITY_THRESHOLD) {
        results.push(await this.assignToCluster(chatId, similarClusters[0].clusterId, question));
      } else if (similarClusters[0]?.score > this.MANUAL_REVIEW_THRESHOLD) {
        results.push(await this.flagForManualReview(chatId, question, intentAnalysis));
      } else {
        results.push(await this.createNewCluster(chatId, question, intentAnalysis));
      }
    }
    
    return results;
  }
}
```

### Personalization Engine

```typescript
class PersonalizationEngine {
  async generatePersonalizedReplies(
    canonicalAnswer: string,
    cluster: MessageCluster
  ): Promise<PersonalizedReply[]> {
    const replies: PersonalizedReply[] = [];
    
    for (const chatId of cluster.affectedChats) {
      const chat = await this.getChat(chatId);
      const tone = await this.extractTone(canonicalAnswer);
      
      const personalizedReply = await this.llm.generate({
        prompt: this.buildPersonalizationPrompt(canonicalAnswer, chat, tone),
        model: 'gpt-4o-mini'
      });
      
      const conflicts = await this.detectConflicts(personalizedReply, chat.history);
      
      replies.push({
        id: generateId(),
        chatId,
        canonicalAnswerId: cluster.canonicalAnswer!.id,
        content: personalizedReply,
        confidence: this.calculateConfidence(personalizedReply),
        conflicts,
        status: conflicts.length > 0 ? 'needs_review' : 'draft'
      });
    }
    
    return replies;
  }
}
```

### Conflict Resolution

```typescript
class ConflictResolver {
  async detectConflicts(
    reply: string,
    chatHistory: Message[]
  ): Promise<string[]> {
    const context = this.extractRelevantContext(chatHistory);
    
    const analysis = await this.llm.analyze(`
      Reply: ${reply}
      Chat Context: ${context}
      
      Identify any contradictions between the reply and the chat context.
      Return specific conflicts as a list.
    `);
    
    return this.parseConflicts(analysis);
  }
  
  async resolveConflicts(
    reply: string,
    conflicts: string[]
  ): Promise<string> {
    return await this.llm.generate(`
      Original reply: ${reply}
      Conflicts: ${conflicts.join(', ')}
      
      Rewrite the reply to address these conflicts while maintaining the core message.
      Add clarifications where necessary.
    `);
  }
}
```

## API Endpoints

### Clustering Service
```
POST /api/clustering/process-message
GET  /api/clustering/clusters
GET  /api/clustering/clusters/:id
PUT  /api/clustering/clusters/:id/merge
DELETE /api/clustering/clusters/:id
```

### Personalization Service
```
POST /api/personalization/generate-replies
GET  /api/personalization/replies/:clusterId
PUT  /api/personalization/replies/:id/approve
POST /api/personalization/replies/send-batch
```

### Analytics
```
GET /api/analytics/cluster-performance
GET /api/analytics/reply-metrics
GET /api/analytics/pro-dashboard
```

## Cost Estimation

### Monthly Costs (1,000 active users, 10,000 messages/day)

| Service | Usage | Cost |
|---------|-------|------|
| OpenAI Embeddings | 10k messages × 30 days | ~$50 |
| GPT-4o (Canonical) | 100 canonical answers | ~$30 |
| GPT-4o-mini (Personalization) | 3k personalized replies | ~$200 |
| Upstash Vector | 300k vectors, 100k queries | ~$25 |
| Appwrite | Standard usage | ~$25 |
| **Total** | | **~$330/month** |

### Cost Optimization Strategies
- Implement smart caching for similar messages
- Batch API calls where possible
- Use GPT-4o-mini for non-critical tasks
- Implement rate limiting to prevent abuse

## Security Considerations

- Encrypt all message content at rest
- Implement proper access controls for Pro dashboard
- Audit trail for all AI-generated content
- Rate limiting on API endpoints
- Input validation and sanitization

## Testing Strategy

### Unit Tests
- Clustering algorithm accuracy
- Personalization engine output quality
- Conflict detection reliability

### Integration Tests
- End-to-end message processing
- API endpoint functionality
- Database operations

### Performance Tests
- Clustering speed under load
- Personalization engine throughput
- Database query optimization

## Monitoring & Alerting

### Key Metrics
- Clustering accuracy rate
- Personalization confidence scores
- API response times
- Error rates
- Cost per message processed

### Alerts
- High error rates
- Unusual clustering patterns
- Cost threshold breaches
- Performance degradation

## Optimized Processing Flow

### Why Intent Recognition Comes First

The system uses a **two-stage processing approach** for optimal clustering accuracy:

1. **Intent Recognition (GPT-4o-mini)**: Parses complex fan messages into individual, focused questions
2. **Focused Embeddings**: Generates embeddings for clean, parsed questions (not complex messages)

**Example:**
```
Fan Message: "How often should I train abs and what protein should I take?"
     ↓
Intent Recognition: ["How often should I train abs?", "What protein should I take?"]
     ↓
Focused Embeddings: [embedding1, embedding2] (clean, topic-specific)
     ↓
Better Clustering: 85%+ similarity matches vs 65% with complex message embeddings
```

This approach delivers:
- **Higher accuracy**: 85%+ similarity vs 65% with complex embeddings
- **Better topic separation**: Fitness questions don't cluster with nutrition questions
- **Reduced manual review**: Fewer outliers and mismatched clusters
- **Cost efficiency**: Better clustering reduces need for expensive GPT-4o corrections

## Getting Started

### Prerequisites
- Node.js 18+
- React Native development environment
- Appwrite instance
- Upstash Vector database
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies: `npx expo install`
3. Configure environment variables
4. Set up Upstash Vector database
5. Configure Appwrite functions
6. Run the development server

### Environment Variables
```
OPENAI_API_KEY=your_openai_key
UPSTASH_VECTOR_URL=your_upstash_url
UPSTASH_VECTOR_TOKEN=your_upstash_token
APPWRITE_ENDPOINT=your_appwrite_endpoint
APPWRITE_PROJECT_ID=your_project_id
STREAM_CHAT_API_KEY=your_stream_key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
