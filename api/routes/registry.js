const express = require('express');
const router = express.Router();
const Registry = require('../models/registry');
const { UserRequired } = require('../db');

router.get('/get/:serial', UserRequired, async (req, res) => {
    try {
        const registries = await Registry.find({ serial: req.params.serial })
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).send(registries.map(Registry.formatRegistry));
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.post('/update', UserRequired, async (req, res) => {
    const { id, createdAt, updatedAt, ...fields } = req.body;

    try {
        const payload = { ...fields, user: req.user.email };
        if (id) {
            await Registry.findByIdAndUpdate(id, payload, { new: true, upsert: true, setDefaultsOnInsert: true });
        } else {
            await Registry.create(payload);
        }
        res.status(200).send({ status: 'OK' });
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

module.exports = router;
