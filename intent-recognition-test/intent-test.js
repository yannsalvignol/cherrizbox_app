import { OpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import dotenv from "dotenv";
import readline from "readline";

// Load environment variables
dotenv.config();

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

// Interactive terminal interface
async function startInteractiveMode() {
    console.log('🧪 Interactive Intent Recognition System');
    console.log('=====================================\n');
    console.log('Enter messages to analyze their intent. Type "exit" to quit.\n');
    
    const recognizer = new IntentRecognizer();
    const chatHistory = [];
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const askQuestion = () => {
        rl.question('💬 Enter your message: ', async (message) => {
            if (message.toLowerCase() === 'exit') {
                console.log('\n👋 Goodbye!');
                rl.close();
                return;
            }
            
            if (message.trim() === '') {
                console.log('Please enter a message.\n');
                askQuestion();
                return;
            }
            
            try {
                console.log('\n🔍 Analyzing...');
                const result = await recognizer.analyzeMessage(message, chatHistory);
                
                console.log('\n✅ Intent Analysis Results:');
                console.log('─'.repeat(40));
                console.log(`💬 Original Message: "${result.message}"`);
                console.log(`📝 Questions (${result.questions.length}):`);
                if (result.questions.length > 0) {
                    result.questions.forEach((q, idx) => {
                        console.log(`   ${idx + 1}. "${q}"`);
                    });
                } else {
                    console.log('   No questions detected');
                }
                console.log(`📄 Context: ${result.context || 'No additional context'}`);
                console.log(`🏷️  Topic: ${result.topic}`);
                console.log(`😊 Tone: ${result.tone}`);
                console.log(`🏪 Tags: [${result.tags.join(', ')}]`);
                
                // Add to chat history (keep last 10 messages)
                chatHistory.push({ role: 'user', content: message });
                if (chatHistory.length > 10) {
                    chatHistory.shift();
                }
                
            } catch (error) {
                console.log(`❌ Error: ${error.message}`);
            }
            
            console.log('\n' + '='.repeat(50) + '\n');
            askQuestion();
        });
    };
    
    askQuestion();
}

// Start interactive mode
startInteractiveMode().catch(console.error);