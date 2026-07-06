const mongoose = require('mongoose');
const { registryFields } = require('./registry-fields');

const registrySchema = new mongoose.Schema(registryFields, {
    timestamps: true,
    versionKey: false,
    collection: 'registries',
});

registrySchema.index({ serial: 1 });
registrySchema.index({ user: 1 });

function formatRegistry(doc) {
    if (!doc) return null;
    const { _id, ...rest } = doc.toObject ? doc.toObject() : doc;
    return { id: _id.toString(), ...rest };
}

function formatRegistrySnapshot(doc) {
    if (!doc) return null;
    const { _id, ...rest } = doc.toObject ? doc.toObject() : doc;
    return rest;
}

const Registry = mongoose.models.Registry || mongoose.model('Registry', registrySchema);
Registry.formatRegistry = formatRegistry;
Registry.formatRegistrySnapshot = formatRegistrySnapshot;

module.exports = Registry;
