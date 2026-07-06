const express = require('express');
const https = require('https');
const router = express.Router();
const Operation = require('../models/operation');
const Registry = require('../models/registry');
const { UserRequired } = require('../db');

async function getLastRegistry(serial) {
    return Registry.findOne({ serial }).sort({ createdAt: -1 });
}

function makePost(hostname, path, method, data, headers = {}) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        const opt = {
            hostname,
            path,
            method,
            rejectUnauthorized: false,
            headers: { ...headers },
        };
        const req = https.request(opt, (res) => {
            res.on('data', (d) => {
                resolve(JSON.parse(d));
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

async function sendEmail(data, hostname, token, language = undefined) {
    const path = '/backend/wp-json/caiman/v1/email';
    const method = 'POST';
    const contentType = 'application/json';
    const headers = { 'Content-Type': contentType, 'Authorization': 'Bearer ' + token };
    if (language) {
        headers['Language'] = language;
    }
    return await makePost(hostname, path, method, data, headers);
}

router.get('/get/:serial', UserRequired, async (req, res) => {
    try {
        const operations = await Operation.find({ serial: req.params.serial }).lean();
        res.status(200).send(operations.map(Operation.formatOperation));
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.get('/id/:id', async (req, res) => {
    try {
        const operation = await Operation.findById(req.params.id).lean();
        if (!operation) {
            return res.status(404).send({ message: 'Operation not found' });
        }
        res.status(200).send(Operation.formatOperation(operation));
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.post('/update', UserRequired, async (req, res) => {
    try {
        const registry = await getLastRegistry(req.body.serial);
        if (registry == null) {
            return res.status(404).send({ message: 'Registry not found' });
        }

        const language = req.headers.Language || undefined;
        const { id, createdAt, updatedAt, ...fields } = req.body;
        const payload = {
            ...fields,
            user: req.user.email,
            data: { ...req.body.data, registry: Registry.formatRegistrySnapshot(registry) },
        };

        const op = id
            ? await Operation.findByIdAndUpdate(id, payload, { new: true, upsert: true, setDefaultsOnInsert: true })
            : await Operation.create(payload);

        const mail = {
            to: registry.email,
            subject: 'operation.new.email.subject',
            body: 'operation.new.email.body',
            placeholders: { id: op._id.toString() },
        };
        await sendEmail(mail, req.hostname, req.token, language);
        res.status(200).send({ status: 'OK' });
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.post('/confirm', async (req, res) => {
    const id = req.body.id;
    if (!id) {
        return res.status(400).send({ message: 'id required' });
    }

    try {
        const operation = await Operation.findByIdAndUpdate(id, {
            confirmed_date: new Date(),
            email_confirmed: typeof req.body.from_email !== 'undefined',
            web_confirmed: typeof req.body.from_email === 'undefined',
        }, { new: true });

        if (!operation) {
            return res.status(404).send({ message: 'Operation not found' });
        }
        res.status(200).send({ status: 'OK' });
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

module.exports = router;
