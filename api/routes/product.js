const express = require('express');
const router = express.Router();
const CatalogProduct = require('../models/catalog-product');
const { UserRequired } = require('../db');

router.get('/', UserRequired, async (req, res) => {
    try {
        const products = await CatalogProduct.find({}, { id_product: 1, legacy_id: 1, name: 1, image: 1 }).lean();
        res.status(200).send(products.map(CatalogProduct.formatProductSummary));
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.get('/get/:id', UserRequired, async (req, res) => {
    try {
        const product = await CatalogProduct.findById(req.params.id).lean();
        if (!product) {
            return res.status(404).send({ message: 'Product not found' });
        }
        res.status(200).send(CatalogProduct.formatProduct(product));
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.get('/key/:id_product', UserRequired, async (req, res) => {
    try {
        const product = await CatalogProduct.findOne({ id_product: req.params.id_product }).lean();
        if (!product) {
            return res.status(404).send({ message: 'Product not found' });
        }
        res.status(200).send(CatalogProduct.formatProduct(product));
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.post('/update', UserRequired, async (req, res) => {
    const { id, id_product, ...fields } = req.body;

    if (!id_product) {
        return res.status(400).send({ message: 'id_product required' });
    }

    const payload = { id_product, ...fields };
    if (typeof id === 'number') {
        payload.legacy_id = id;
    }

    try {
        await CatalogProduct.findOneAndUpdate(
            { id_product },
            payload,
            { new: true, upsert: true, setDefaultsOnInsert: true },
        );
        res.status(200).send({ status: 'OK' });
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

router.post('/delete', UserRequired, async (req, res) => {
    const { id, id_product } = req.body;
    if (!id && !id_product) {
        return res.status(400).send({ message: 'id or id_product required' });
    }

    try {
        if (id) {
            await CatalogProduct.findByIdAndDelete(id);
        } else {
            await CatalogProduct.findOneAndDelete({ id_product });
        }
        res.status(200).send({ status: 'OK' });
    } catch (ex) {
        res.status(500).send({ message: ex.message });
    }
});

module.exports = router;
