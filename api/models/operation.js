const mongoose = require('mongoose');
const { registryEmbeddedSchema } = require('./registry-fields');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    surname: { type: String, required: true },
    email: { type: String, required: true },
    password: String,
    fiscal_code: { type: String, required: true },
    business_name: { type: String, required: true },
    address: { type: String, required: true },
    street_number: { type: String, required: true },
    phone: { type: String, required: true },
    mobile: { type: String, required: true },
    city: { type: String, required: true },
    province: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
    tokens: String,
    flat_license_expiration: String,
    last_token_usage: String,
}, { _id: false });

const operationDataSchema = new mongoose.Schema({
    type: { type: String, default: '' },
    description: { type: String, default: '' },
    replaced_components: { type: String, default: '' },
    breakdowns: { type: [String], default: [] },
    condition: { type: String, default: '' },
    warranty: { type: String, default: '' },
    e_system: { type: String, default: '' },
    hp_system: { type: String, default: '' },
    se_system: { type: String, default: '' },
    li_suitability: { type: String, default: '' },
    spaces_respected: { type: String, default: '' },
    presence_ventilation_opening: { type: String, default: '' },
    vent_opening_appropriate: { type: String, default: '' },
    vent_opening_free: { type: String, default: '' },
    correct_sections: { type: String, default: '' },
    sh_section_limits: { type: String, default: '' },
    correct_slope: { type: String, default: '' },
    length_se_sections: { type: Number, default: 0 },
    vs_length: { type: Number, default: 0 },
    bends_45: { type: Number, default: 0 },
    bends_90: { type: Number, default: 0 },
    smoke_pipe_section: { type: Number, default: 0 },
    chimney_section: { type: Number, default: 0 },
    t_inspection: { type: String, default: '' },
    conservation_status: { type: String, default: '' },
    exhaust_duct_leaks: { type: String, default: '' },
    roof_smoke_exhaust: { type: String, default: '' },
    windproof_chimney: { type: String, default: '' },
    chimney_insulation: { type: String, default: '' },
    draught_classification: { type: Number, default: 0 },
    draught_value: { type: Number, default: 0 },
    registry: registryEmbeddedSchema,
    service: userSchema,
}, { _id: false });

const operationSchema = new mongoose.Schema({
    serial: { type: String, required: true },
    user: { type: String, required: true },
    confirmed_date: { type: Date, default: null },
    email_confirmed: { type: Boolean, default: false },
    web_confirmed: { type: Boolean, default: false },
    data: { type: operationDataSchema, required: true },
}, {
    timestamps: true,
    versionKey: false,
    collection: 'operations',
});

operationSchema.index({ serial: 1 });
operationSchema.index({ user: 1 });

function formatOperation(doc) {
    if (!doc) return null;
    const { _id, ...rest } = doc.toObject ? doc.toObject() : doc;
    return { id: _id.toString(), ...rest };
}

const Operation = mongoose.models.Operation || mongoose.model('Operation', operationSchema);
Operation.formatOperation = formatOperation;

module.exports = Operation;
