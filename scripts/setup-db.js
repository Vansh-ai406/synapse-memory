// Script to initialize MongoDB collections, TTL indexes, and print Atlas Search index JSON.
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/synapse_memory';
const dbName = process.env.MONGODB_DB_NAME || 'synapse_memory';

async function setupDatabase() {
  console.log(`Connecting to MongoDB at: ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected successfully to MongoDB.');

    const db = client.db(dbName);
    const collection = db.collection('memories');

    // 1. Create TTL index on 'expiresAt' field
    console.log('Creating TTL Index on expiresAt (auto-expiration)...');
    await collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: 'ttl_memory_expiry_idx' }
    );
    console.log('TTL index created: Memories with expiresAt will automatically purge upon expiry.');

    // 2. Create Compound index for workspace and lifecycle queries
    console.log('Creating Compound Index on workspaceId + lifecycle.status + updatedAt...');
    await collection.createIndex(
      { workspaceId: 1, 'lifecycle.status': 1, updatedAt: -1 },
      { name: 'workspace_status_updated_idx' }
    );
    console.log('Compound query index created.');

    // 3. Create Index on type and tags
    await collection.createIndex({ type: 1, tags: 1 }, { name: 'type_tags_idx' });
    console.log('Tags & Type index created.');

    console.log('\n======================================================');
    console.log('MONGODB ATLAS VECTOR SEARCH INDEX SPECIFICATION:');
    console.log('If deploying to MongoDB Atlas, create a Vector Search Index named "vector_index":');
    console.log(
      JSON.stringify(
        {
          fields: [
            {
              type: 'vector',
              path: 'embedding',
              numDimensions: 768,
              similarity: 'cosine',
            },
            {
              type: 'filter',
              path: 'workspaceId',
            },
            {
              type: 'filter',
              path: 'lifecycle.status',
            },
            {
              type: 'filter',
              path: 'type',
            },
          ],
        },
        null,
        2
      )
    );
    console.log('======================================================\n');
    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Database setup encountered an error:', error.message);
  } finally {
    await client.close();
  }
}

setupDatabase();
