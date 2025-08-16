const { Client, Storage } = require('node-appwrite');
require('dotenv').config();

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

async function emptyBucket(bucketId) {
  try {
    console.log(`🔄 Starting to empty bucket: ${bucketId}`);
    
         // First, try a simple listFiles call to see what we get
     console.log('📡 Testing basic listFiles call...');
     try {
       const testResponse = await storage.listFiles(bucketId);
       console.log('📡 Basic response structure:', Object.keys(testResponse));
       console.log('📡 Files array:', testResponse.files ? testResponse.files.length : 'No files property');
       
       if (testResponse.files && testResponse.files.length > 0) {
         console.log('📡 First file sample:', JSON.stringify(testResponse.files[0], null, 2));
       }
     } catch (error) {
       console.error('❌ Error with basic listFiles:', error);
     }
     
     // Fetch ALL files from the bucket (handling pagination)
     let allFiles = [];
     let offset = 0;
     const limit = 100; // Appwrite's max per request
     
     console.log('📡 Fetching all files from bucket...');
     
           // Use iterative deletion approach since pagination isn't working
      console.log('📡 Using iterative deletion approach...');
      
      let totalDeleted = 0;
      let iteration = 1;
      
      while (true) {
        try {
          // Get current batch of files
          const response = await storage.listFiles(bucketId);
          const currentFiles = response.files;
          
          if (currentFiles.length === 0) {
            console.log('✅ No more files found - bucket is empty!');
            break;
          }
          
          console.log(`📡 Iteration ${iteration}: Found ${currentFiles.length} files (Total reported: ${response.total})`);
          
          // Delete all files in current batch
          const batchSize = 10;
          for (let i = 0; i < currentFiles.length; i += batchSize) {
            const batch = currentFiles.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(currentFiles.length / batchSize);
            
            console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)`);
            
            try {
              await Promise.all(
                batch.map(async (file) => {
                  await storage.deleteFile(bucketId, file.$id);
                  console.log(`🗑️  Deleted: ${file.name || file.$id}`);
                  totalDeleted++;
                })
              );
              
              // Small delay between batches to avoid rate limits
              if (i + batchSize < currentFiles.length) {
                console.log('⏳ Waiting 500ms before next batch...');
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
            } catch (batchError) {
              console.error(`❌ Error in batch ${batchNumber}:`, batchError);
              // Continue with next batch
            }
          }
          
          console.log(`✅ Iteration ${iteration} complete: Deleted ${currentFiles.length} files`);
          console.log(`📊 Total deleted so far: ${totalDeleted}`);
          
          // Wait before next iteration to let Appwrite update
          console.log('⏳ Waiting 2 seconds before next iteration...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          iteration++;
          
        } catch (error) {
          console.error(`❌ Error in iteration ${iteration}:`, error);
          break;
        }
      }
      
            console.log(`📡 Iterative deletion complete. Total files deleted: ${totalDeleted}`);
      return { success: true, deletedCount: totalDeleted, totalFiles: totalDeleted };
    
  } catch (error) {
    console.error('❌ Failed to empty bucket:', error);
    return { success: false, error: error.message };
  }
}

async function main() {
  // Check required environment variables
  if (!process.env.APPWRITE_PROJECT_ID) {
    console.error('❌ APPWRITE_PROJECT_ID is required in .env file');
    process.exit(1);
  }
  
  if (!process.env.APPWRITE_API_KEY) {
    console.error('❌ APPWRITE_API_KEY is required in .env file');
    process.exit(1);
  }
  
  if (!process.env.BUCKET_ID) {
    console.error('❌ BUCKET_ID is required in .env file');
    process.exit(1);
  }
  
  console.log('🚀 Appwrite Bucket Emptying Tool');
  console.log('================================');
  console.log(`Project ID: ${process.env.APPWRITE_PROJECT_ID}`);
  console.log(`Bucket ID: ${process.env.BUCKET_ID}`);
  console.log(`Endpoint: ${process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'}`);
  console.log('');
  
  // Confirm before proceeding
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('⚠️  Are you sure you want to delete ALL files in this bucket? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      console.log('🔄 Proceeding with bucket emptying...');
      const result = await emptyBucket(process.env.BUCKET_ID);
      
      if (result.success) {
        console.log(`✅ Success! Deleted ${result.deletedCount} files`);
        process.exit(0);
      } else {
        console.error('❌ Failed to empty bucket');
        process.exit(1);
      }
    } else {
      console.log('❌ Operation cancelled');
      process.exit(0);
    }
    
    rl.close();
  });
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { emptyBucket };
