const { Client, Users } = require('node-appwrite');
require('dotenv').config();

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY_USERS_PERMISSION);

const users = new Users(client);

async function deleteAllUsers() {
  try {
    console.log('🔄 Starting to delete all users...');
    
    // First, get a count of all users
    console.log('📡 Getting user count...');
    const userList = await users.list();
    const totalUsers = userList.total;
    
    if (totalUsers === 0) {
      console.log('✅ No users found - project is empty');
      return { success: true, deletedCount: 0 };
    }
    
    console.log(`📊 Found ${totalUsers} users to delete`);
    
    // Delete users in batches to avoid rate limits
    const batchSize = 10;
    let deletedCount = 0;
    let failedCount = 0;
    let currentOffset = 0;
    
                     // Use iterative deletion approach since pagination isn't working
      console.log('📡 Using iterative deletion approach...');
      
      let totalDeleted = 0;
      let iteration = 1;
      
      while (true) {
        try {
          // Get current batch of users
          const response = await users.list();
          const currentUsers = response.users;
          
          if (currentUsers.length === 0) {
            console.log('✅ No more users found - project is empty!');
            break;
          }
          
          console.log(`📡 Iteration ${iteration}: Found ${currentUsers.length} users (Total reported: ${response.total})`);
          
          // Delete all users in current batch
          const batchSize = 10;
          for (let i = 0; i < currentUsers.length; i += batchSize) {
            const batch = currentUsers.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(currentUsers.length / batchSize);
            
            console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)`);
            
            try {
              await Promise.all(
                batch.map(async (user) => {
                  await users.delete(user.$id);
                  console.log(`🗑️  Deleted user: ${user.email || user.$id}`);
                  totalDeleted++;
                })
              );
              
              // Small delay between batches to avoid rate limits
              if (i + batchSize < currentUsers.length) {
                console.log('⏳ Waiting 500ms before next batch...');
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
            } catch (batchError) {
              console.error(`❌ Error in batch ${batchNumber}:`, batchError);
              // Continue with next batch
            }
          }
          
          console.log(`✅ Iteration ${iteration} complete: Deleted ${currentUsers.length} users`);
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
    
    console.log(`📡 User deletion complete. Total processed: ${deletedCount + failedCount}`);
    console.log(`✅ Successfully deleted: ${deletedCount} users`);
    console.log(`❌ Failed to delete: ${failedCount} users`);
    
    return { 
      success: true, 
      deletedCount, 
      failedCount, 
      totalUsers,
      processedCount: deletedCount + failedCount
    };
    
  } catch (error) {
    console.error('❌ Failed to delete users:', error);
    return { success: false, error: error.message };
  }
}

async function main() {
  // Check required environment variables
  if (!process.env.APPWRITE_PROJECT_ID) {
    console.error('❌ APPWRITE_PROJECT_ID is required in .env file');
    process.exit(1);
  }
  
  if (!process.env.APPWRITE_API_KEY_USERS_PERMISSION) {
    console.error('❌ APPWRITE_API_KEY_USERS_PERMISSION is required in .env file');
    process.exit(1);
  }
  
  console.log('🚀 Appwrite User Deletion Tool');
  console.log('================================');
  console.log(`Project ID: ${process.env.APPWRITE_PROJECT_ID}`);
  console.log(`Endpoint: ${process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'}`);
  console.log('');
  
  // Extra warning for user deletion
  console.log('⚠️  ⚠️  ⚠️  WARNING: This will delete ALL users from your project! ⚠️  ⚠️  ⚠️');
  console.log('⚠️  This action is IRREVERSIBLE and will remove all user accounts!');
  console.log('⚠️  Make sure you have backups if needed!');
  console.log('');
  
  // Confirm before proceeding
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('⚠️  Are you ABSOLUTELY sure you want to delete ALL users? Type "DELETE ALL USERS" to confirm: ', async (answer) => {
    if (answer === 'DELETE ALL USERS') {
      console.log('🔄 Proceeding with user deletion...');
      const result = await deleteAllUsers();
      
      if (result.success) {
        console.log(`✅ Success! Deleted ${result.deletedCount} users`);
        if (result.failedCount > 0) {
          console.log(`⚠️  ${result.failedCount} users could not be deleted`);
        }
        process.exit(0);
      } else {
        console.error('❌ Failed to delete users');
        process.exit(1);
      }
    } else {
      console.log('❌ Operation cancelled - confirmation text did not match');
      process.exit(0);
    }
    
    rl.close();
  });
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { deleteAllUsers }; 