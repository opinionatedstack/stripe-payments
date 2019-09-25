const { MongoClient } = require('mongodb');
const mongoDbClient = new MongoClient(process.env.MONGODB_PAYMENTS_CONN_STRING, { useNewUrlParser: true, useUnifiedTopology: true });
let db;
mongoDbClient.connect()
    .then(async r => {
        console.log('Connected correctly to MongoDb server');
        module.exports.db = await mongoDbClient.db(process.env.MONGODB_PAYMENTS_NAME);
        console.log('Connected correctly to MongoDb database', process.env.MONGODB_PAYMENTS_NAME);
    }, e => {
        console.error('Error connecting to MongoDb server or db', e);
    });

module.exports = { db: db };
