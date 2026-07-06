const express = require('express');
const fs = require('fs');
const router = express.Router();
const { UserRequired } = require('../db');

router.post('/', UserRequired, async (req, res) => {
    var upload_dir = "uploads/";
    var filepath = upload_dir + req.body.name + "." + req.body.ext;
    let buff = new Buffer(req.body.chunk, 'base64');
    fs.writeFile(
        filepath,
        buff,
        { flag: "a" },
        function () {
        }
    );
    res.send({ "status": "OK" });
});

module.exports = router;
