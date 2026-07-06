const mongoose = require('mongoose');

const rolesSchema = {
    roles: { type: [String], default: [] },
};

const documentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    file: { type: String, required: true },
    ...rolesSchema,
}, { _id: false });

const linkSchema = new mongoose.Schema({
    name: { type: String, required: true },
    link: { type: String, required: true },
    ...rolesSchema,
}, { _id: false });

const faqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    response: { type: String, required: true },
}, { _id: false });

const videoSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    video: { type: String, required: true },
}, { _id: false });

const firmwareSchema = new mongoose.Schema({
    revision: { type: String, required: true },
    file: { type: Number, required: true },
    ...rolesSchema,
}, { _id: false });

const databaseValueSchema = new mongoose.Schema({
    id: { type: String, required: true },
    value: { type: String, required: true },
}, { _id: false });

const databaseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    values: { type: [databaseValueSchema], default: [] },
    ...rolesSchema,
}, { _id: false });

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

const catalogProductSchema = new mongoose.Schema({
    id_product: { type: String, required: true, unique: true },
    legacy_id: { type: Number, default: null },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: null },
    documents: { type: [documentSchema], default: [] },
    links: { type: [linkSchema], default: [] },
    faq: { type: [faqSchema], default: [] },
    video: { type: [videoSchema], default: [] },
    gateway_firmware_list: { type: [firmwareSchema], default: [] },
    board_firmware_list: { type: [firmwareSchema], default: [] },
    variables: { type: [variableSchema], default: [] },
    database: { type: [databaseSchema], default: [] },
}, {
    timestamps: false,
    versionKey: false,
    collection: 'catalog_products',
});

function formatProduct(doc) {
    if (!doc) return null;
    const { _id, legacy_id, ...rest } = doc.toObject ? doc.toObject() : doc;
    return {
        id: legacy_id ?? 0,
        ...rest,
    };
}

function formatProductSummary(doc) {
    if (!doc) return null;
    const { _id, legacy_id, id_product, name, image } = doc.toObject ? doc.toObject() : doc;
    return {
        id: legacy_id ?? 0,
        id_product,
        name,
        image,
    };
}

const CatalogProduct = mongoose.models.CatalogProduct || mongoose.model('CatalogProduct', catalogProductSchema);
CatalogProduct.formatProduct = formatProduct;
CatalogProduct.formatProductSummary = formatProductSummary;

module.exports = CatalogProduct;
