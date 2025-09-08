import { OpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import dotenv from "dotenv";

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
            1. All distinct questions/intents (separate multiple questions)
            2. Main topic category (fitness, nutrition, training, recovery, lifestyle, general)
            3. Emotional tone (neutral, excited, frustrated, confused, worried)
            
            Message: "{message}"
            Chat history context: "{history}"
            
            Return ONLY valid JSON without any markdown formatting or code blocks:
            {{
                "questions": ["question 1", "question 2"],
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
                questions: [message],
                topic: 'general',
                tone: 'neutral',
                tags: []
            };
        }
    }
}

// Test function
async function testIntentRecognition() {
    console.log('🧪 Testing Intent Recognition System...\n');
    
    const recognizer = new IntentRecognizer();
    
    // Test cases
    const testCases = [
        {
            message: "How often should I train abs and what protein should I take?",
            history: []
        },
        {
            message: "I'm confused about my workout routine. Should I do cardio first or weights? Also, what about rest days?",
            history: [
                { role: 'fan', content: 'Hi, I\'m new to fitness' },
                { role: 'pro', content: 'Welcome! I\'m here to help you get started.' }
            ]
        },
        {
            message: "What's the best time to eat protein?",
            history: []
        },
        {
            message: "I hurt my back last week. Can I still do squats? What exercises should I avoid?",
            history: [
                { role: 'fan', content: 'I have a lower back injury' },
                { role: 'pro', content: 'I understand. Let\'s be careful with your back.' }
            ]
        }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`📝 Test Case ${i + 1}:`);
        console.log(`Message: "${testCase.message}"`);
        console.log(`History: ${testCase.history.length > 0 ? 'Yes' : 'No'}`);
        
        try {
            const result = await recognizer.analyzeMessage(testCase.message, testCase.history);
            
            console.log(`\n✅ Results:`);
            console.log(`   Questions (${result.questions.length}):`);
            result.questions.forEach((q, idx) => {
                console.log(`     ${idx + 1}. "${q}"`);
            });
            console.log(`   Topic: ${result.topic}`);
            console.log(`   Tone: ${result.tone}`);
            console.log(`   Tags: [${result.tags.join(', ')}]`);
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        
        console.log('\n' + '='.repeat(80) + '\n');
    }
    
    console.log('�� Intent Recognition testing completed!');
}

// Run the test
testIntentRecognition().catch(console.error);