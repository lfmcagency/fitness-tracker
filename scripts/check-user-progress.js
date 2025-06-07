const { MongoClient } = require('mongodb');

async function checkUserProgress() {
  const client = new MongoClient('mongodb+srv://louisfaucher95:ZHEpXGfvuNF7ydoB@fitness-tracker.dsosg.mongodb.net/?retryWrites=true&w=majority');
  await client.connect();
  
  const db = client.db('fitness-tracker');
  const userProgress = await db.collection('userprogresses').find({}).toArray();
  
  console.log('UserProgress documents:', userProgress.length);
  console.log(JSON.stringify(userProgress, null, 2));
  
  await client.close();
}

checkUserProgress().catch(console.error);