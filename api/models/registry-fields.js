const mongoose = require('mongoose');

const registryFields = {
    serial: { type: String, default: '' },
    fiscal_code: { type: String, default: '' },
    business_name: { type: String, default: '' },
    name: { type: String, default: '' },
    surname: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    street_number: { type: String, default: '' },
    phone: { type: String, default: '' },
    mobile: { type: String, default: '' },
    city: { type: String, default: '' },
    province: { type: String, default: '' },
    zip: { type: String, default: '' },
    country: { type: String, default: '' },
    purchase_date: Date,
    first_ignition_date: Date,
    dealer: { type: String, default: '' },
    invoice: { type: String, default: '' },
    warranty: { type: String, default: '' },
    user: { type: String, default: '' },
};

const registryEmbeddedSchema = new mongoose.Schema({
    ...registryFields,
    createdAt: Date,
}, { _id: false });

module.exports = { registryFields, registryEmbeddedSchema };
