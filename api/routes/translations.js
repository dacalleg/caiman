const express = require('express');
const router = express.Router();

router.get('/:lang', (req, res) => {
    const lang = req.params.lang;
    if (!/^[a-z]{2}$/i.test(lang)) {
        return res.status(400).send({ message: 'Invalid language' });
    }
    try {
        res.status(200).send(require(`../i18n/${lang.toLowerCase()}.js`));
    } catch (ex) {
        res.status(404).send({ message: 'Language not found' });
    }
});

module.exports = router;
