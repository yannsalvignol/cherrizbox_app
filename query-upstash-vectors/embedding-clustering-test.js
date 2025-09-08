import { Index } from "@upstash/vector";
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Initialize Upstash Vector
const index = new Index({
    url: process.env.UPSTASH_URL,
    token: process.env.UPSTASH_TOKEN
});

/**
 * Generate embedding for a single question
 */
async function generateEmbedding(question) {
    try {
        const response = await openai.embeddings.create({
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
 * Store a question with its embedding in Upstash
 */
async function storeQuestion(question, chatId, userId, creatorId, topic = 'general') {
    try {
        const embedding = await generateEmbedding(question);
        
        const id = `q_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`;
        
        await index.upsert({
            id,
            vector: embedding,
            metadata: {
                question,
                chatId,
                userId,
                creatorId,
                topic,
                timestamp: Date.now(),
                clusterId: null
            }
        });
        
        console.log(`✅ Stored question: "${question}"`);
        
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
async function findSimilarQuestions(question, threshold = 0.85, topic = null) {
    try {
        const embedding = await generateEmbedding(question);
        
        // Build filter - search all questions, we'll handle clustering logic separately
        let filter = null;
        if (topic) {
            filter = `topic = "${topic}"`;
        }
        
        const results = await index.query({
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
async function createCluster(questions, creatorId, topic, originalMetadata = null) {
    const clusterId = `cluster_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`;
    const clusterTimestamp = Date.now();
    
    console.log(`\n🔄 Creating cluster: ${clusterId}`);
    console.log(`   Topic: ${topic}`);
    console.log(`   Questions: ${questions.length}`);
    console.log(`   Created at: ${new Date(clusterTimestamp).toISOString()}`);
    
    // Update all questions to belong to this cluster
    for (const question of questions) {
        let metadataToUpdate;
        
        if (question.metadata) {
            // Use metadata from the question object (from similarity search)
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
            // Fallback: try to fetch metadata
            const currentQuestion = await index.fetch([question.id]);
            console.log(`     DEBUG - Fetched metadata for ${question.id}:`, currentQuestion[0]?.metadata);
            
            metadataToUpdate = {
                ...(currentQuestion[0]?.metadata || {}),
                clusterId,
                clusterTimestamp
            };
        }
        
        
        await index.update({
            id: question.id,
            metadata: metadataToUpdate
        });
    }
    
    return clusterId;
}

/**
 * Main clustering logic
 */
async function processQuestion(question, chatId, userId, creatorId, topic = 'general') {
    console.log(`\n📝 Processing question: "${question}"`);
    
    // Step 1: Store the question
    const questionId = await storeQuestion(question, chatId, userId, creatorId, topic);
    
    // Step 2: Find similar questions
    const similarQuestions = await findSimilarQuestions(question, 0.7, topic);
    
    console.log(`   Found ${similarQuestions.length} similar questions`);
    
    if (similarQuestions.length > 0) {
        // Check if any already belong to a cluster
        const existingCluster = similarQuestions.find(q => q.metadata.clusterId);
        
        if (existingCluster) {
            // Add to existing cluster
            const clusterId = existingCluster.metadata.clusterId;
            console.log(`   ✅ Adding to existing cluster: ${clusterId}`);
            
            await index.update({
                id: questionId,
                metadata: {
                    clusterId,
                    processed: true
                }
            });
            
            return { questionId, clusterId, action: 'added_to_existing' };
        } else {
            // Create new cluster with all similar questions (both processed and unprocessed)
            const unprocessedQuestions = similarQuestions.filter(q => !q.metadata.processed);
            const allQuestions = [{ id: questionId }, ...unprocessedQuestions];
            const clusterId = await createCluster(allQuestions, creatorId, topic);
            
            // If there are processed similar questions, we need to update them too
            const processedSimilar = similarQuestions.filter(q => q.metadata.processed && !q.metadata.clusterId);
            for (const processedQ of processedSimilar) {
                await index.update({
                    id: processedQ.id,
                    metadata: {
                        clusterId,
                        processed: true
                    }
                });
            }
            
            return { questionId, clusterId, action: 'created_new_cluster' };
        }
    } else {
        // Create new cluster for this unique question
        const clusterId = await createCluster([{ id: questionId }], creatorId, topic);
        
        return { questionId, clusterId, action: 'created_unique_cluster' };
    }
}

/**
 * Clear existing test data
 */
async function clearTestData() {
    try {
        console.log('🧹 Clearing existing test data...');
        
        // Use a real embedding to query all vectors
        const dummyEmbedding = await generateEmbedding("test");
        const allVectors = await index.query({
            vector: dummyEmbedding,
            topK: 1000,
            includeVectors: false,
            includeMetadata: true
        });
        
        if (allVectors.length > 0) {
            const ids = allVectors.map(v => v.id);
            await index.delete(ids);
            console.log(`   Deleted ${ids.length} existing vectors`);
        } else {
            console.log('   No existing vectors to delete');
        }
    } catch (error) {
        console.log('   No existing data to clear or error occurred:', error.message);
    }
}

/**
 * Test similarity between specific questions
 */
async function testSimilarity() {
    console.log('🔍 Testing similarity between questions...\n');
    
    const questions = [
        "How often should I train abs?",
        "What's the best ab workout frequency?",
        "How many times per week should I do core exercises?"
    ];
    
    // Generate embeddings for all questions
    const embeddings = [];
    for (const question of questions) {
        const embedding = await generateEmbedding(question);
        embeddings.push({ question, embedding });
    }
    
    // Calculate cosine similarity between each pair
    function cosineSimilarity(a, b) {
        const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }
    
    console.log('Similarity scores:');
    for (let i = 0; i < embeddings.length; i++) {
        for (let j = i + 1; j < embeddings.length; j++) {
            const similarity = cosineSimilarity(embeddings[i].embedding, embeddings[j].embedding);
            console.log(`"${embeddings[i].question}" vs "${embeddings[j].question}": ${similarity.toFixed(4)}`);
        }
    }
    console.log('');
}

/**
 * Process a single question and assign to cluster
 */
async function processNewQuestion(question, chatId = 'interactive', userId = 'user', creatorId = 'pro_1', topic = 'general') {
    console.log(`\n📝 Processing question: "${question}"`);
    
    try {
        // Step 1: Store the question
        const questionId = await storeQuestion(question, chatId, userId, creatorId, topic);
        
        // Wait a moment for indexing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 2: Find similar questions in existing vectors (search all topics for better clustering)
        const similarQuestions = await findSimilarQuestions(question, 0.7, null);
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
                
                // Get current metadata and preserve it
                const currentQuestion = await index.fetch([questionId]);
                const updatedMetadata = {
                    ...currentQuestion[0].metadata,
                    clusterId,
                    clusterTimestamp
                };
                
                await index.update({
                    id: questionId,
                    metadata: updatedMetadata
                });
                
                return { questionId, clusterId, action: 'added_to_existing' };
            } else {
                // Create new cluster with all unclustered similar questions
                const unclusteredSimilar = similarQuestions.filter(q => !q.metadata.clusterId);
                const allQuestions = [{ id: questionId }, ...unclusteredSimilar];
                const originalMetadata = { questionId, question, chatId, userId, creatorId, topic, timestamp: Date.now() };
                const clusterId = await createCluster(allQuestions, creatorId, topic, originalMetadata);
                
                return { questionId, clusterId, action: 'created_new_cluster' };
            }
        } else {
            // Create new cluster for this unique question
            const originalMetadata = { questionId, question, chatId, userId, creatorId, topic, timestamp: Date.now() };
            const clusterId = await createCluster([{ id: questionId }], creatorId, topic, originalMetadata);
            
            return { questionId, clusterId, action: 'created_unique_cluster' };
        }
    } catch (error) {
        console.error('❌ Error processing question:', error);
        throw error;
    }
}

/**
 * Display all current clusters
 */
async function displayClusters() {
    try {
        console.log('\n📊 Current Clusters:');
        console.log('='.repeat(60));
        
        // Get all vectors
        const dummyEmbedding = await generateEmbedding("test");
        const allVectors = await index.query({
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
            });
        });
        
        // Display unclustered questions
        if (unclustered.length > 0) {
            console.log(`\n❓ Unclustered Questions (${unclustered.length}):`);
            unclustered.forEach((q, idx) => {
                console.log(`   ${idx + 1}. "${q.metadata.question || 'Unknown'}"`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error displaying clusters:', error);
    }
}

/**
 * Interactive question processing
 */
async function interactiveMode() {
    console.log('🤖 Interactive Question Clustering System');
    console.log('=========================================');
    console.log('Commands:');
    console.log('  ask <question>     - Process a new question');
    console.log('  clusters           - Show all clusters');
    console.log('  clear              - Clear all data');
    console.log('  exit               - Exit the system');
    console.log('');
    
    const readline = await import('readline');
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
            const [command, ...args] = input.trim().split(' ');
            
            switch (command.toLowerCase()) {
                case 'ask':
                    if (args.length === 0) {
                        console.log('❌ Please provide a question. Usage: ask <question>');
                        break;
                    }
                    const question = args.join(' ');
                    await processNewQuestion(question);
                    break;
                    
                case 'clusters':
                    await displayClusters();
                    break;
                    
                case 'clear':
                    await clearTestData();
                    break;
                    
                case 'exit':
                    console.log('👋 Goodbye!');
                    rl.close();
                    return;
                    
                default:
                    console.log('❌ Unknown command. Available: ask, clusters, clear, exit');
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }
}

// Run the interactive mode
interactiveMode().catch(console.error);