# Appwrite Bucket Utilities

Utility scripts for managing Appwrite storage buckets.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in this directory with your Appwrite credentials:

```bash
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id_here
APPWRITE_API_KEY=your_api_key_here

# Bucket to empty
BUCKET_ID=your_bucket_id_here
```

### 3. Run the Script
```bash
npm start
# or
npm run empty
# or
node empty_bucket.js
```

## 🔧 Configuration

### Required Environment Variables

- **`APPWRITE_PROJECT_ID`**: Your Appwrite project ID
- **`APPWRITE_API_KEY`**: Your Appwrite API key with storage permissions
- **`BUCKET_ID`**: The ID of the bucket you want to empty

### Optional Environment Variables

- **`APPWRITE_ENDPOINT`**: Appwrite endpoint (defaults to cloud.appwrite.io)

## 📋 How It Works

1. **Safety Check**: Script confirms before deleting files
2. **Batch Processing**: Deletes files in batches of 10 to avoid rate limits
3. **Progress Tracking**: Shows progress through batches
4. **Error Handling**: Continues processing even if individual files fail
5. **Rate Limiting**: 500ms delay between batches

## ⚠️ Important Notes

- **This will permanently delete ALL files in the specified bucket**
- **Make sure you have a backup if needed**
- **Ensure your API key has storage write permissions**
- **Test on a development bucket first**

## 🔑 Getting Your Appwrite Credentials

1. Go to your Appwrite Console
2. Navigate to Project Settings → API Keys
3. Create a new API key with storage permissions
4. Copy the Project ID and API Key

## 🚨 Safety Features

- **Confirmation Prompt**: Script asks for confirmation before proceeding
- **Batch Processing**: Prevents overwhelming the API
- **Error Handling**: Continues processing even if some deletions fail
- **Progress Logging**: Shows exactly what's being deleted

## 📝 Example Output

```
🚀 Appwrite Bucket Emptying Tool
================================
Project ID: 64f8a1b2c3d4e5f6a7b8c9d0
Bucket ID: 64f8a1b2c3d4e5f6a7b8c9d1
Endpoint: https://cloud.appwrite.io/v1

⚠️  Are you sure you want to delete ALL files in this bucket? (yes/no): yes
🔄 Proceeding with bucket emptying...
🔄 Starting to empty bucket: 64f8a1b2c3d4e5f6a7b8c9d1
📁 Found 25 files in bucket
🔄 Processing batch 1/3 (10 files)
🗑️  Deleted: image1.jpg
🗑️  Deleted: image2.jpg
...
✅ Successfully deleted 25/25 files
✅ Success! Deleted 25 files
```

## 🛠️ Troubleshooting

### Common Issues

1. **"APPWRITE_PROJECT_ID is required"**
   - Check your `.env` file exists and has the correct values

2. **"Permission denied"**
   - Ensure your API key has storage write permissions

3. **"Bucket not found"**
   - Verify the bucket ID is correct

4. **Rate limiting errors**
   - The script automatically handles this, but you can increase delays if needed

## 📚 API Reference

The script exports an `emptyBucket` function that can be used programmatically:

```javascript
const { emptyBucket } = require('./empty_bucket');

const result = await emptyBucket('your-bucket-id');
console.log(result);
// { success: true, deletedCount: 25, totalFiles: 25 }
``` 