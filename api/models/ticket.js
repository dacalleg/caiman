const mongoose = require('mongoose');

const ticketAssetSchema = new mongoose.Schema({
    path: { type: String, required: true },
}, { _id: false });

const ticketSchema = new mongoose.Schema({
    email: { type: String, required: true },
    title: { type: String, default: null },
    serial: { type: String, required: true },
    status: { type: String, default: 'open' },
    text: { type: String, default: null },
    customer: { type: Number, default: 0 },
    parent_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    assets: { type: [ticketAssetSchema], default: [] },
}, {
    timestamps: true,
    versionKey: false,
    collection: 'tickets',
});

ticketSchema.index({ serial: 1 });
ticketSchema.index({ parent_id: 1 });

function formatTicket(doc) {
    if (!doc) return null;
    const { _id, ...rest } = doc.toObject ? doc.toObject() : doc;
    return { id: _id.toString(), ...rest };
}

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
Ticket.formatTicket = formatTicket;

module.exports = Ticket;
