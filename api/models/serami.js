const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
    value: { type: Number, required: true },
    operator: { type: String, required: true },
}, { _id: false });

const variableColorSchema = new mongoose.Schema({
    condition: { type: conditionSchema, required: true },
    color: { type: String, required: true },
}, { _id: false });

const variableSchema = new mongoose.Schema({
    address: { type: Number, required: true },
    bit: { type: Number, required: true },
    bits: [mongoose.Schema.Types.Mixed],
    group: { type: String, required: true },
    hash: { type: String, required: true },
    mask: Number,
    max: Number,
    memory: { type: String, required: true },
    min: Number,
    name: { type: String, required: true },
    pattern: { type: String, required: true },
    readExp: String,
    readonly: { type: Boolean, required: true },
    sanitizedName: { type: String, required: true },
    type: { type: String, required: true },
    values: [[String]],
    writeExp: String,
    signed: { type: Boolean, required: true },
    formatstring: { type: String, required: true },
    description: String,
    varKey: String,
    sort: Number,
    step: Number,
    colors: [variableColorSchema],
    genFn: String,
    button: Boolean,
    caption: String,
    buttonValue: Number,
    buttonBackgroundColor: String,
    buttonTextColor: String,
}, { _id: false });

const seramiSchema = new mongoose.Schema({
    name: { type: String, required: true },
    data: { type: [variableSchema], required: true, default: [] },
}, {
    timestamps: false,
    versionKey: false,
    collection: 'serami',
});

function formatSeramiEntry(doc) {
    if (!doc) return null;
    const { _id, ...rest } = doc.toObject ? doc.toObject() : doc;
    return { id: _id.toString(), ...rest };
}

const Serami = mongoose.models.Serami || mongoose.model('Serami', seramiSchema);
Serami.formatSeramiEntry = formatSeramiEntry;

module.exports = Serami;
