const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');

const { connectMongo } = require('./mongo');
const Ticket = require('./models/ticket');
const { Board, Product, Database, TranslationText } = require('./db');
const healthcheck = require('./routes/healthcheck');
const translations = require('./routes/translations');
const ticket = require('./routes/ticket');
const logs = require('./routes/logs');
const registry = require('./routes/registry');
const operation = require('./routes/operation');
const serami = require('./routes/serami');
const product = require('./routes/product');
const chunkupload = require('./routes/chunkupload');

async function init() {
    try {
        const app = express();
        const PORT = 80;

        await connectMongo();

        await Board.sync({ alter: true });
        await Product.sync({ alter: true });
        await TranslationText.sync({ alter: true });
        await Database.sync({ alter: true });

        app.set('trust proxy', true);
        app.use(cors());
        app.use(bodyParser.json({ limit: '10mb' }));

        app.use('/healthcheck', healthcheck);
        app.use('/translations', translations);
        app.use('/ticket', ticket);
        app.use('/logs', logs);
        app.use('/registry', registry);
        app.use('/operation', operation);
        app.use('/serami', serami);
        app.use('/product', product);
        app.use('/chunkupload', chunkupload);

        app.listen(PORT, (error) => {
            if (!error) {
                console.log("Server is Successfully Running, and App is listening on port " + PORT);
            } else {
                throw error;
            }
        });
    } catch (e) {
        console.log(e);
    }
}

init().then(() => console.log("INIT DONE"));
