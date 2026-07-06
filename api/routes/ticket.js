const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Ticket = require('../models/ticket');
const { UserRequired } = require('../db');

async function loadTicketHierarchy(ticket) {
    const children = await Ticket.find({ parent_id: ticket.id }).sort({ createdAt: 1 }).lean();
    ticket.children = [];
    for (const child of children) {
        ticket.children.push(await loadTicketHierarchy(Ticket.formatTicket(child)));
    }
    return ticket;
}

router.post('/add', UserRequired, async (req, res) => {
    try {
        if (req.body.parent !== undefined && !mongoose.isValidObjectId(req.body.parent)) {
            return res.status(400).send({ message: 'Invalid parent id' });
        }

        if (req.body.parent !== undefined) {
            req.body.ticket["status"] = "open";
        }

        const ticket = await Ticket.create({
            ...req.body.ticket,
            id: undefined,
            email: req.user.email,
            parent_id: req.body.parent || null,
        });
        res.status(200).send({ status: "OK" });
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.post('/close', UserRequired, async (req, res) => {
    try {
        await Ticket.findByIdAndUpdate(req.body.id, { status: 'closed' }, { new: true });
        res.status(200).send({ status: "OK" });
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.get('/get/:serial', UserRequired, async (req, res) => {
    const serial = req.params.serial;
    try {
        const tickets = await Ticket.find({ serial, parent_id: null }).sort({ createdAt: 1 }).lean();
        res.status(200).send(await Promise.all(tickets.map(async (ticket) => loadTicketHierarchy(Ticket.formatTicket(ticket)))));
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

module.exports = router;
