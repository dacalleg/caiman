const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    type: { type: Number, required: true, min: 0, max: 4 },
    data: mongoose.Schema.Types.Mixed,
    from: mongoose.Schema.Types.Mixed,
    set: mongoose.Schema.Types.Mixed,
    written: mongoose.Schema.Types.Mixed,
    variable: String,
    user: String,
    serial: String,
    gateway: String,
}, {
    timestamps: false,
    versionKey: false,
    collection: 'logs',
});

logSchema.index({ serial: 1, date: 1 });
logSchema.index({ gateway: 1, date: 1 });

module.exports = mongoose.models.Log || mongoose.model('Log', logSchema);
