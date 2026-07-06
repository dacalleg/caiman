const mongoose = require('mongoose');

function mongoUri() {
    const user = process.env.MONGO_USER || process.env.MONGODB_USER;
    const pass = process.env.MONGO_PASSWORD || process.env.MONGODB_PASS;
    const host = process.env.MONGO_HOST || 'caiman_mongo';
    const database = process.env.MONGO_DATABASE || 'caiman';

    if (user && pass) {
        return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:27017/${database}?authSource=admin`;
    }
    return `mongodb://${host}:27017/${database}`;
}

async function connectMongo() {
    await mongoose.connect(mongoUri());
}

module.exports = { connectMongo };
