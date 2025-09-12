# Intent Recognition & Question Clustering Pipeline

A combined system that analyzes messages to extract questions and automatically clusters similar questions using vector embeddings.

## Features

- **Intent Recognition**: Extracts questions, context, topic, tone, and tags from messages
- **Question Clustering**: Groups similar questions using OpenAI embeddings and vector similarity
- **Full Context Preservation**: Stores both individual questions and the full original message
- **Interactive CLI**: Test the pipeline with real-time message processing
- **Cluster Visualization**: View all clusters and their questions

## Architecture

1. **Intent Recognition** (using LangChain + GPT-4o-mini)
   - Analyzes incoming messages
   - Extracts all distinct questions
   - Identifies context, topic, tone, and tags

2. **Question Clustering** (using OpenAI embeddings + Upstash Vector)
   - Generates embeddings for each question
   - Finds similar questions using cosine similarity
   - Automatically groups questions into clusters
   - Preserves full message context alongside individual questions

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your API keys:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   UPSTASH_URL=your_upstash_vector_url_here
   UPSTASH_TOKEN=your_upstash_vector_token_here
   ```

3. Run the interactive pipeline:
   ```bash
   npm start
   ```

## Usage

### Interactive Mode

The system provides an interactive CLI where you can:

- Enter messages to process through the pipeline
- View all clusters with `clusters`
- Clear all data with `clear`
- Exit with `exit`

### Example Messages

Try these example messages to see the pipeline in action:

```
"How often should I train abs? Also, what's the best ab workout?"
"I'm feeling tired after workouts. Should I rest more? How much sleep do I need?"
"My goal is to build muscle. What exercises work best for chest?"
```

### Pipeline Flow

1. **Message Input**: User enters a message
2. **Intent Analysis**: System extracts questions, context, topic, tone, tags
3. **Question Processing**: Each question is processed individually:
   - Generate embedding
   - Find similar questions
   - Add to existing cluster or create new cluster
4. **Results Display**: Show clustering results and context

## Data Structure

Each stored question includes:
- `question`: The extracted question text
- `fullMessage`: Complete original message for context
- `chatId`, `userId`, `creatorId`: Tracking information
- `topic`: Categorized topic (fitness, nutrition, etc.)
- `tone`: Emotional tone (neutral, excited, frustrated, etc.)
- `tags`: Relevant tags
- `clusterId`: Assigned cluster ID
- `timestamp`: Creation timestamp

## Clustering Logic

- Questions with similarity score ≥ 0.8 are considered similar
- If similar questions exist in a cluster, new question joins that cluster
- If similar questions exist but aren't clustered, a new cluster is created
- Unique questions get their own cluster
- Full message context is preserved for all questions

## API

The system exports three main classes:

- `IntentRecognizer`: Handles message analysis and question extraction
- `QuestionClusterer`: Manages embedding generation and clustering
- `IntentClusteringPipeline`: Combined pipeline orchestrating both systems
