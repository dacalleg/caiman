const express = require('express');
const router = express.Router();
const Log = require('../models/log');
const { UserRequired } = require('../db');

router.get('/serial/:id', UserRequired, async (req, res) => {
    try {
        const logs = await Log.find({ serial: req.params.id }).sort({ date: 1 }).lean();
        res.status(200).send(logs);
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.get('/gateway/:id', UserRequired, async (req, res) => {
    try {
        const logs = await Log.find({ gateway: req.params.id }).sort({ date: 1 }).lean();
        res.status(200).send(logs);
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.post('/', UserRequired, async (req, res) => {
    const body = { ...req.body, user: req.user.email };

    if (!body.serial && !body.gateway) {
        return res.status(400).send({ message: 'serial or gateway required' });
    }

    try {
        await Log.create(body);
        res.status(200).send({ status: 'OK' });
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

module.exports = router;
