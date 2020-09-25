const { MongoClient } = require('mongodb');

const mongoDbClient = new MongoClient(
    process.env.LOGGING_MONGODB_CLUSTER_CONN_STRING + process.env.LOGGING_MONGODB_DB + process.env.LOGGING_MONDODB_OPTIONS,
    { useNewUrlParser: true, useUnifiedTopology: true });

let db;
mongoDbClient.connect()
    .then(async r => {
        console.log('Connected correctly to MongoDb server');
        module.exports.db = await mongoDbClient.db(process.env.LOGGING_MONGODB_PAYMENTS_COLLECTION);
        console.log('Connected correctly to MongoDb database', process.env.LOGGING_MONGODB_PAYMENTS_COLLECTION);
    }, e => {
        console.error('Error connecting to MongoDb server or db', e);
    });

module.exports = { db: db };
