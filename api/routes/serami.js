const express = require('express');
const router = express.Router();
const Serami = require('../models/serami');
const { UserRequired } = require('../db');

router.get('/', UserRequired, async (req, res) => {
    try {
        const entries = await Serami.find({}, { name: 1 }).lean();
        res.status(200).send(entries.map(Serami.formatSeramiEntry));
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.post('/delete', UserRequired, async (req, res) => {
    const id = req.body.id;
    if (!id) {
        return res.status(400).send({ message: 'id required' });
    }

    try {
        await Serami.findByIdAndDelete(id);
        res.status(200).send({ status: 'OK' });
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.post('/update', UserRequired, async (req, res) => {
    const { id, ...fields } = req.body;

    try {
        if (id) {
            await Serami.findByIdAndUpdate(id, fields, { new: true, upsert: true, setDefaultsOnInsert: true });
        } else {
            await Serami.create(fields);
        }
        res.status(200).send({ status: 'OK' });
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.get('/get/:id', UserRequired, async (req, res) => {
    try {
        const entry = await Serami.findById(req.params.id).lean();
        if (!entry) {
            return res.status(404).send({ message: 'Serami not found' });
        }
        res.status(200).send(Serami.formatSeramiEntry(entry));
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

module.exports = router;
