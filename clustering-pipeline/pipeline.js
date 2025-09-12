import { OpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { Index } from "@upstash/vector";
import OpenAIClient from "openai";
import dotenv from "dotenv";
import readline from "readline";

// Load environment variables
dotenv.config();

/**
 * Intent Recognition System
 * Analyzes messages to extract questions, context, and metadata
 */
class IntentRecognizer {
    constructor() {
        this.llm = new OpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "gpt-4o-mini",
            temperature: 0.1
        });
        
        this.intentPrompt = PromptTemplate.fromTemplate(`
            Analyze this message and extract:
            1. All distinct questions/intents - identify every question in the message, whether there are 0, 1, 5, or more
            2. Context - any non-question text (statements, descriptions, background info, etc.)
            3. Main topic category (fitness, nutrition, training, recovery, lifestyle, general)
            4. Emotional tone (neutral, excited, frustrated, confused, worried)
            
            Message: "{message}"
            Chat history context: "{history}"
            
            Instructions:
            - Extract ALL questions as separate items in the questions array
            - Put any remaining text (statements, context, background) in the context field
            - If there are no questions, questions array should be empty
            - If there is no additional context beyond questions, context should be empty string
            
            Return ONLY valid JSON without any markdown formatting or code blocks:
            {{
                "message": "the full original message text",
                "questions": ["question 1", "question 2", "question 3"],
                "context": "any non-question text or background information",
                "topic": "category",
                "tone": "emotional_tone",
                "tags": ["tag1", "tag2"]
            }}
        `);
        
        this.intentChain = new LLMChain({
            llm: this.llm,
            prompt: this.intentPrompt
        });
    }
    
    async analyzeMessage(message, chatHistory = []) {
        try {
            const historyText = chatHistory
                .slice(-5) // Last 5 messages for context
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');
            
            const result = await this.intentChain.call({
                message: message,
                history: historyText
            });
            
            // Clean the response to handle markdown code blocks
            let cleanedText = result.text.trim();
            
            // Remove markdown code block markers if present
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            return JSON.parse(cleanedText);
        } catch (error) {
            console.error('Intent recognition failed:', error);
            // Fallback to simple analysis
            return {
                message: message,
                questions: message.includes('?') ? [message] : [],
                context: message.includes('?') ? '' : message,
                topic: 'general',
                tone: 'neutral',
                tags: []
            };
        }
    }
}

/**
 * Question Clustering System
 * Handles embedding generation and clustering of questions
 */
class QuestionClusterer {
    constructor() {
        // Initialize OpenAI for embeddings
        this.openai = new OpenAIClient({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Initialize Upstash Vector
        this.index = new Index({
            url: process.env.UPSTASH_URL,
            token: process.env.UPSTASH_TOKEN
        });
    }
    
    /**
     * Generate embedding for a single question
     */
    async generateEmbedding(question) {
        try {
            const response = await this.openai.embeddings.create({
                model: "text-embedding-3-small",
                input: question
            });
            
            return response.data[0].embedding;
        } catch (error) {
            console.error('Embedding generation failed:', error);
            throw error;
        }
    }
    
    /**
     * Store a question with its embedding and full message context
     */
    async storeQuestion(question, fullMessage, chatId, userId, creatorId, topic = 'general', tone = 'neutral', tags = []) {
        try {
            const embedding = await this.generateEmbedding(question);
            
            const id = `q_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`;
            
            await this.index.upsert({
                id,
                vector: embedding,
                metadata: {
                    question,
                    fullMessage, // Store the complete original message for context
                    chatId,
                    userId,
                    creatorId,
                    topic,
                    tone,
                    tags: JSON.stringify(tags),
                    timestamp: Date.now(),
                    clusterId: null
                }
            });
            
            console.log(`✅ Stored question: "${question}"`);
            console.log(`   From message: "${fullMessage.substring(0, 100)}${fullMessage.length > 100 ? '...' : ''}"`);
            
            // Small delay to ensure the vector is indexed
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return id;
        } catch (error) {
            console.error('Failed to store question:', error);
            throw error;
        }
    }
    
    /**
     * Find similar questions using vector similarity
     */
    async findSimilarQuestions(question, threshold = 0.85, topic = null) {
        try {
            const embedding = await this.generateEmbedding(question);
            
            // Build filter - search all questions, we'll handle clustering logic separately
            let filter = null;
            if (topic) {
                filter = `topic = "${topic}"`;
            }
            
            const results = await this.index.query({
                vector: embedding,
                topK: 10,
                includeVectors: false,
                includeMetadata: true,
                filter: filter
            });
            
            // Debug: Log similarity scores
            console.log(`   Similarity scores for "${question}":`);
            results.forEach(result => {
                console.log(`     Score: ${result.score.toFixed(3)} - "${result.metadata?.question || 'undefined'}" (clustered: ${result.metadata?.clusterId ? 'yes' : 'no'})`);
            });
            
            // Filter by threshold and exclude the exact same question
            const filtered = results.filter(result => 
                result.score >= threshold && 
                result.metadata.question !== question
            );
            console.log(`   Found ${filtered.length} questions above threshold ${threshold}`);
            
            return filtered;
        } catch (error) {
            console.error('Similarity search failed:', error);
            throw error;
        }
    }
    
    /**
     * Create a cluster and assign questions to it
     */
    async createCluster(questions, creatorId, topic, originalMetadata = null) {
        const clusterId = `cluster_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`;
        const clusterTimestamp = Date.now();
        
        console.log(`\n🔄 Creating cluster: ${clusterId}`);
        console.log(`   Topic: ${topic}`);
        console.log(`   Questions: ${questions.length}`);
        console.log(`   Created at: ${new Date(clusterTimestamp).toISOString()}`);
        
        // Update all questions to belong to this cluster
        for (const question of questions) {
            let metadataToUpdate;
            
            if (question.metadata && question.metadata.question) {
                // Use metadata from the question object (from similarity search) - has complete metadata
                metadataToUpdate = {
                    ...question.metadata,
                    clusterId,
                    clusterTimestamp
                };
            } else if (originalMetadata && question.id === originalMetadata.questionId) {
                // Use the original metadata for the new question
                metadataToUpdate = {
                    ...originalMetadata,
                    clusterId,
                    clusterTimestamp
                };
            } else {
                // Fallback: try to fetch metadata, but ensure we don't lose the question text
                const currentQuestion = await this.index.fetch([question.id]);
                const fetchedMetadata = currentQuestion[0]?.metadata || {};
                
                // If we don't have a question in the metadata, skip this question
                if (!fetchedMetadata.question) {
                    continue;
                }
                
                metadataToUpdate = {
                    ...fetchedMetadata,
                    clusterId,
                    clusterTimestamp
                };
            }
            
            await this.index.update({
                id: question.id,
                metadata: metadataToUpdate
            });
        }
        
        return clusterId;
    }
    
    /**
     * Process a single question and assign to cluster
     */
    async processQuestion(question, fullMessage, chatId, userId, creatorId, topic = 'general', tone = 'neutral', tags = []) {
        console.log(`\n📝 Processing question: "${question}"`);
        
        try {
            // Step 1: Store the question with full message context
            const questionId = await this.storeQuestion(question, fullMessage, chatId, userId, creatorId, topic, tone, tags);
            
            // Wait a moment for indexing
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Step 2: Find similar questions in existing vectors (search all topics for better clustering)
            const similarQuestions = await this.findSimilarQuestions(question, 0.8, null);
            console.log(`   Found ${similarQuestions.length} similar questions`);
            
            if (similarQuestions.length > 0) {
                // Show similar questions found
                console.log('   Similar questions:');
                similarQuestions.forEach((q, idx) => {
                    console.log(`     ${idx + 1}. "${q.metadata.question}" (score: ${q.score.toFixed(3)})`);
                });
                
                // Check if any similar questions already belong to a cluster
                const existingCluster = similarQuestions.find(q => q.metadata.clusterId);
                
                if (existingCluster) {
                    // Add to existing cluster
                    const clusterId = existingCluster.metadata.clusterId;
                    const clusterTimestamp = existingCluster.metadata.clusterTimestamp;
                    console.log(`   ✅ Adding to existing cluster: ${clusterId}`);
                    
                    // Use original metadata instead of fetching (fetch has timing issues)
                    const updatedMetadata = {
                        question,
                        fullMessage,
                        chatId,
                        userId,
                        creatorId,
                        topic,
                        tone,
                        tags: JSON.stringify(tags),
                        timestamp: Date.now(),
                        clusterId,
                        clusterTimestamp
                    };
                    
                    await this.index.update({
                        id: questionId,
                        metadata: updatedMetadata
                    });
                    
                    return { questionId, clusterId, action: 'added_to_existing' };
                } else {
                    // Create new cluster with all unclustered similar questions
                    const unclusteredSimilar = similarQuestions.filter(q => !q.metadata.clusterId);
                    const allQuestions = [
                        { id: questionId }, 
                        ...unclusteredSimilar.map(q => ({ id: q.id, metadata: q.metadata }))
                    ];
                    const originalMetadata = { 
                        questionId, 
                        question, 
                        fullMessage, 
                        chatId, 
                        userId, 
                        creatorId, 
                        topic, 
                        tone, 
                        tags: JSON.stringify(tags), 
                        timestamp: Date.now() 
                    };
                    const clusterId = await this.createCluster(allQuestions, creatorId, topic, originalMetadata);
                    
                    return { questionId, clusterId, action: 'created_new_cluster' };
                }
            } else {
                // Create new cluster for this unique question
                const originalMetadata = { 
                    questionId, 
                    question, 
                    fullMessage, 
                    chatId, 
                    userId, 
                    creatorId, 
                    topic, 
                    tone, 
                    tags: JSON.stringify(tags), 
                    timestamp: Date.now() 
                };
                const clusterId = await this.createCluster([{ id: questionId }], creatorId, topic, originalMetadata);
                
                return { questionId, clusterId, action: 'created_unique_cluster' };
            }
        } catch (error) {
            console.error('❌ Error processing question:', error);
            throw error;
        }
    }
    
    /**
     * Clear existing test data
     */
    async clearTestData() {
        try {
            console.log('🧹 Clearing existing test data...');
            
            // Use a real embedding to query all vectors
            const dummyEmbedding = await this.generateEmbedding("test");
            const allVectors = await this.index.query({
                vector: dummyEmbedding,
                topK: 1000,
                includeVectors: false,
                includeMetadata: true
            });
            
            if (allVectors.length > 0) {
                const ids = allVectors.map(v => v.id);
                await this.index.delete(ids);
                console.log(`   Deleted ${ids.length} existing vectors`);
            } else {
                console.log('   No existing vectors to delete');
            }
        } catch (error) {
            console.log('   No existing data to clear or error occurred:', error.message);
        }
    }
    
    /**
     * Display all current clusters
     */
    async displayClusters() {
        try {
            console.log('\n📊 Current Clusters:');
            console.log('='.repeat(60));
            
            // Get all vectors
            const dummyEmbedding = await this.generateEmbedding("test");
            const allVectors = await this.index.query({
                vector: dummyEmbedding,
                topK: 1000,
                includeVectors: false,
                includeMetadata: true
            });
            
            if (allVectors.length === 0) {
                console.log('No questions stored yet.');
                return;
            }
            
            // Group by cluster IDs
            const clusters = {};
            const unclustered = [];
            
            allVectors.forEach(vector => {
                const clusterId = vector.metadata.clusterId;
                if (clusterId) {
                    if (!clusters[clusterId]) {
                        clusters[clusterId] = [];
                    }
                    clusters[clusterId].push(vector);
                } else {
                    unclustered.push(vector);
                }
            });
            
            console.log(`\nTotal vectors: ${allVectors.length}`);
            console.log(`Clusters: ${Object.keys(clusters).length}`);
            console.log(`Unclustered: ${unclustered.length}`);
            
            // Display clusters
            Object.entries(clusters).forEach(([clusterId, questions]) => {
                const clusterTimestamp = questions[0].metadata.clusterTimestamp;
                let createdAt = 'Unknown';
                
                if (clusterTimestamp && !isNaN(clusterTimestamp)) {
                    createdAt = new Date(clusterTimestamp).toLocaleString();
                }
                
                console.log(`\n🔗 Cluster: ${clusterId}`);
                console.log(`   Topic: ${questions[0].metadata.topic || 'Unknown'}`);
                console.log(`   Created: ${createdAt}`);
                console.log(`   Questions (${questions.length}):`);
                questions.forEach((q, idx) => {
                    console.log(`     ${idx + 1}. "${q.metadata.question || 'Unknown'}"`);
                    if (q.metadata.fullMessage && q.metadata.fullMessage !== q.metadata.question) {
                        const preview = q.metadata.fullMessage.substring(0, 80);
                        console.log(`        Context: "${preview}${q.metadata.fullMessage.length > 80 ? '...' : ''}"`);
                    }
                });
            });
            
            // Display unclustered questions
            if (unclustered.length > 0) {
                console.log(`\n❓ Unclustered Questions (${unclustered.length}):`);
                unclustered.forEach((q, idx) => {
                    console.log(`   ${idx + 1}. "${q.metadata.question || 'Unknown'}"`);
                    if (q.metadata.fullMessage && q.metadata.fullMessage !== q.metadata.question) {
                        const preview = q.metadata.fullMessage.substring(0, 80);
                        console.log(`      Context: "${preview}${q.metadata.fullMessage.length > 80 ? '...' : ''}"`);
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Error displaying clusters:', error);
        }
    }
}

/**
 * Combined Intent Recognition and Clustering Pipeline
 */
class IntentClusteringPipeline {
    constructor() {
        this.intentRecognizer = new IntentRecognizer();
        this.questionClusterer = new QuestionClusterer();
        this.chatHistory = [];
    }
    
    /**
     * Process a complete message through intent recognition and clustering
     */
    async processMessage(message, chatId = 'interactive', userId = 'user', creatorId = 'pro_1') {
        console.log(`\n🚀 Processing Message: "${message}"`);
        console.log('='.repeat(80));
        
        try {
            // Step 1: Intent Recognition
            console.log('\n🔍 Step 1: Intent Analysis');
            const intentResult = await this.intentRecognizer.analyzeMessage(message, this.chatHistory);
            
            console.log(`✅ Intent Analysis Complete:`);
            console.log(`   Questions found: ${intentResult.questions.length}`);
            console.log(`   Topic: ${intentResult.topic}`);
            console.log(`   Tone: ${intentResult.tone}`);
            console.log(`   Context: ${intentResult.context || 'None'}`);
            console.log(`   Tags: [${intentResult.tags.join(', ')}]`);
            
            // Step 2: Process each question through clustering
            const clusteringResults = [];
            
            if (intentResult.questions.length > 0) {
                console.log('\n🔗 Step 2: Question Clustering');
                
                for (let i = 0; i < intentResult.questions.length; i++) {
                    const question = intentResult.questions[i];
                    console.log(`\n   Processing question ${i + 1}/${intentResult.questions.length}: "${question}"`);
                    
                    const clusterResult = await this.questionClusterer.processQuestion(
                        question,
                        intentResult.message, // Full message as context
                        chatId,
                        userId,
                        creatorId,
                        intentResult.topic,
                        intentResult.tone,
                        intentResult.tags
                    );
                    
                    clusteringResults.push({
                        question,
                        ...clusterResult
                    });
                    
                    console.log(`   ✅ Question clustered: ${clusterResult.action}`);
                }
            } else {
                console.log('\n📝 No questions found - message contains only context/statements');
            }
            
            // Add to chat history (keep last 10 messages)
            this.chatHistory.push({ role: 'user', content: message });
            if (this.chatHistory.length > 10) {
                this.chatHistory.shift();
            }
            
            // Return comprehensive result
            return {
                originalMessage: message,
                intentAnalysis: intentResult,
                clusteringResults,
                totalQuestionsProcessed: intentResult.questions.length
            };
            
        } catch (error) {
            console.error('❌ Pipeline processing failed:', error);
            throw error;
        }
    }
    
    /**
     * Display pipeline results in a formatted way
     */
    displayResults(result) {
        console.log('\n📋 Pipeline Results Summary:');
        console.log('='.repeat(60));
        console.log(`💬 Original Message: "${result.originalMessage}"`);
        console.log(`🔍 Questions Extracted: ${result.totalQuestionsProcessed}`);
        console.log(`🏷️  Topic: ${result.intentAnalysis.topic}`);
        console.log(`😊 Tone: ${result.intentAnalysis.tone}`);
        
        if (result.clusteringResults.length > 0) {
            console.log('\n🔗 Clustering Results:');
            result.clusteringResults.forEach((cluster, idx) => {
                console.log(`   ${idx + 1}. "${cluster.question}"`);
                console.log(`      → ${cluster.action} (Cluster: ${cluster.clusterId})`);
            });
        }
        
        if (result.intentAnalysis.context) {
            console.log(`\n📄 Additional Context: "${result.intentAnalysis.context}"`);
        }
    }
}

/**
 * Interactive CLI Interface
 */
async function interactiveMode() {
    console.log('🤖 Intent Recognition & Question Clustering Pipeline');
    console.log('===================================================');
    console.log('Commands:');
    console.log('  <message>          - Process a message through the pipeline');
    console.log('  clusters           - Show all clusters');
    console.log('  clear              - Clear all data');
    console.log('  exit               - Exit the system');
    console.log('');
    console.log('💡 Example messages to try:');
    console.log('   "How often should I train abs? Also, what\'s the best ab workout?"');
    console.log('   "I\'m feeling tired after workouts. Should I rest more? How much sleep do I need?"');
    console.log('   "My goal is to build muscle. What exercises work best for chest?"');
    console.log('');
    
    const pipeline = new IntentClusteringPipeline();
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const askQuestion = (prompt) => {
        return new Promise((resolve) => {
            rl.question(prompt, resolve);
        });
    };
    
    while (true) {
        try {
            const input = await askQuestion('> ');
            const trimmedInput = input.trim();
            
            if (trimmedInput.toLowerCase() === 'exit') {
                console.log('👋 Goodbye!');
                rl.close();
                return;
            }
            
            if (trimmedInput.toLowerCase() === 'clusters') {
                await pipeline.questionClusterer.displayClusters();
                continue;
            }
            
            if (trimmedInput.toLowerCase() === 'clear') {
                await pipeline.questionClusterer.clearTestData();
                continue;
            }
            
            if (trimmedInput === '') {
                console.log('Please enter a message or command.');
                continue;
            }
            
            // Process the message through the pipeline
            const result = await pipeline.processMessage(trimmedInput);
            pipeline.displayResults(result);
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
        
        console.log('\n' + '='.repeat(80) + '\n');
    }
}

// Start the interactive mode
interactiveMode().catch(console.error);

// Export for testing
export { IntentRecognizer, QuestionClusterer, IntentClusteringPipeline };