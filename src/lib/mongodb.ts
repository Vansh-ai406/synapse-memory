import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/synapse_memory';
const dbName = process.env.MONGODB_DB_NAME || 'synapse_memory';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so the client is preserved across module reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
    });
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, avoid using a global variable
  client = new MongoClient(uri, {
    maxPoolSize: 50,
  });
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function getMongoClient(): Promise<MongoClient> {
  return clientPromise;
}

export default clientPromise;
