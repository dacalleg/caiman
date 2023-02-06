'use strict';
const jwt = require('jsonwebtoken');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const JWT_KEY = "tokenagua";
const PORT = 80;
const HOST = '0.0.0.0';

const app = express();
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
app.use(cors());

app.get('/healthcheck', (req, res) => {
    res.send(200);
});

app.post('/user', async (req, res) => {
    const user = req.body.username;
    const token = req.body.password;

    if(user === "admin" && token === "!17exb7GZ42$")
        res.status(200).send("allow administrator");
    else
    {
        jwt.verify(token, JWT_KEY, function (err, decoded) {
            if (err)
                res.status(200).send("deny")
            else {
                if (decoded.email !== user)
                    res.status(200).send("deny")
                res.status(200).send("allow");
            }
        });
    }
});
app.post('/vhost', async (req, res) => {
    res.status(200).send("allow")
});
app.post('/resource', async (req, res) => {
    res.status(200).send("allow")
});
app.post('/topic', async (req, res) => {
    res.status(200).send("allow")
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);