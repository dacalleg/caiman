const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const https = require('https');

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const JWT_KEY = process.env.JWT_AUTH_SECRET_KEY;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    dialect: 'mariadb',
    host: DB_HOST,
    dialectOptions: {}
});

const { Ticket, Asset, Log, Serami, Registry, Operation } = require('./model')(sequelize, DataTypes);
const { buildSeramiTranslationsCsv, buildExportFilename } = require('./serami-translations-export');
const express = require('express');
var cors = require('cors')
const fs = require('fs');


const UserRequired = (req, res, next) => {
    if (req.headers.authorization) {
        let token = req.headers.authorization;
        if (req.headers.authorization.split(' ')[0] === 'Bearer') {
            token = req.headers.authorization.split(' ')[1];
        }
        jwt.verify(token, JWT_KEY, function (err, decoded) {
            if (err)
                return res.sendStatus(403);
            req.token = token;
            req.user = decoded;
            next();
        });
    } else {
        return res.sendStatus(403);
    }
};

function loadTicketHierarchy(ticket) {
    return new Promise(async (resolve, reject) => {
        try {
            const children = await Ticket.findAll({
                where: {
                    parent_id: ticket.id
                },
                include: [
                    Asset
                ]
            });
            ticket.children = [];
            for (let child of children) {
                ticket.children.push(await loadTicketHierarchy(child.toJSON()));
            }
            resolve(ticket);
        } catch (ex) {
            reject(ex);
        }
    });
}


async function init() {
    try {
        const app = express();

        const PORT = 80;

        await Ticket.sync({ alter: true });
        await Asset.sync({ alter: true });
        await Log.sync({ alter: true });
        await Serami.sync({ alter: true });
        await Registry.sync({ alter: true });
        await Operation.sync({ alter: true });

        app.set('trust proxy', true)
        app.use(cors());
        app.use(bodyParser.json({ limit: '10mb' }));

        app.get('/healthcheck', (req, res) => {
            res.send(200);
        });

        app.get('/translations/:lang', (req, res) => {
            const lang = req.params.lang;
            if (!/^[a-z]{2}$/i.test(lang)) {
                return res.status(400).send({ message: 'Invalid language' });
            }
            try {
                res.status(200).send(require(`./i18n/${lang.toLowerCase()}.js`));
            } catch (ex) {
                res.status(404).send({ message: 'Language not found' });
            }
        });

        app.post('/ticket/add', UserRequired, async (req, res) => {
            try {
                if (req.body.parent !== undefined) {
                    req.body.ticket["status"] = "open";
                }

                let obj = { ...req.body.ticket, email: req.user.email };
                const ticket = await Ticket.create(obj, { include: [Asset] });

                if (req.body.parent !== undefined) {
                    await ticket.setParent(req.body.parent);
                }
                res.status(200).send({ status: "OK" });
            } catch (ex) {

                res.status(500).send({ message: ex.message });
            }
        });

        app.post('/ticket/close', UserRequired, async (req, res) => {
            try {
                await Ticket.update({ status: 'closed' }, { where: { id: req.body.id } });
                res.status(200).send({ status: "OK" });
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.get('/ticket/get/:serial', UserRequired, async (req, res) => {
            const serial = req.params.serial;
            try {
                const tickets = await Ticket.findAll(
                    {
                        where: {
                            serial: serial,
                            parent_id: null
                        },
                        include: [
                            Asset
                        ]
                    }
                );
                res.status(200).send(await Promise.all(tickets.map(async (ticket) => loadTicketHierarchy(ticket.toJSON()))));
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.get('/logs/serial/:id', UserRequired, async (req, res) => {
            const serial = req.params.id;
            try {
                const logs = await Log.findAll(
                    {
                        where: {
                            serial: serial,
                        },
                        order: [['date', 'ASC']]
                    }
                );
                res.status(200).send(logs);
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.get('/logs/gateway/:id', UserRequired, async (req, res) => {
            const gatewayId = req.params.id;
            try {
                const logs = await Log.findAll(
                    {
                        where: {
                            gateway: gatewayId,
                        },
                        order: [['date', 'ASC']]
                    }
                );
                res.status(200).send(logs);
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.post('/logs', UserRequired, async (req, res) => {
            const userId = req.user.email;
            const body = { ...req.body, user: userId };
            try {
                const log = await Log.create(body);
                res.status(200).send({ status: "OK" });
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.get('/serami', UserRequired, async (req, res) => {
            try {
                res.status(200).send(await Serami.findAll({ attributes: { exclude: ['data'] } }));
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.get('/registry/get/:serial', UserRequired, async (req, res) => {
            const serial = req.params.serial;
            try {
                res.status(200).send(await Registry.findAll(
                    {
                        where: {
                            serial: serial,
                        },
                        order: [["createdAt", "DESC"]]
                    }
                ));
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.post('/registry/update', UserRequired, async (req, res) => {
            try {
                const { key, createdAt, updatedAt, ...fields } = req.body;
                const body = { ...fields, user: req.user.email };
                await Registry.create(body);
                res.status(200).send({ status: "OK" });
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.get('/operation/get/:serial', UserRequired, async (req, res) => {
            const serial = req.params.serial;
            try {
                res.status(200).send(await Operation.findAll(
                    {
                        where: {
                            serial: serial,
                        }
                    }
                ));
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.get('/operation/key/:key', async (req, res) => {
            try {
                res.status(200).send(await Operation.findByPk(req.params.key));
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.post('/operation/update', UserRequired, async (req, res) => {
            try {
                const registry = await getLastRegistry(req.body.serial);
                if(registry != null)
                {
                    const language = req.headers.Language || undefined;
                    const body = { ...req.body, user: req.user.email, createdAt: undefined, updatedAt: undefined, data: {...req.body.data, registry: registry}};
                    const [op, created] = await Operation.upsert(body);

                    try {
                        const mail = {
                            to: registry.email,
                            subject: "operation.new.email.subject",
                            body: "operation.new.email.body",
                            placeholders: {'key': op.dataValues.key}
                        };
                        await sendEmail(mail, req.hostname, req.token, language);
                    } catch (emailError) {
                        console.error('Failed to send operation notification email:', emailError.message);
                    }
                    res.status(200).send({ status: "OK" });
                }
                else
                {
                    res.status(404).send({ message: "Registry not found" });

                }
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.post('/operation/confirm', async (req, res) => {
            try {
                await Operation.update({ confirmed_date: sequelize.fn('NOW'), email_confirmed: (typeof req.body.from_email !== "undefined") ? 1 : 0, web_confirmed: (typeof req.body.from_email === "undefined") ? 1 : 0 }, {
                    where: {
                        key: req.body.key,
                    },
                });
                res.status(200).send({ status: "OK" });
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.post('/serami/delete', UserRequired, async (req, res) => {
            try {
                await Serami.destroy({
                    where: {
                        key: req.body.key
                    }
                })
                res.status(200).send({ status: "OK" });
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.post('/serami/update', UserRequired, async (req, res) => {
            try {
                await Serami.upsert(req.body)
                res.status(200).send({ status: "OK" });
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.get('/serami/get/:id', UserRequired, async (req, res) => {
            const id = req.params.id;
            try {
                res.status(200).send(await Serami.findByPk(id));
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.get('/serami/batch', UserRequired, async (req, res) => {
            try {
                const keys = (req.query.keys || '')
                    .split(',')
                    .map(key => key.trim())
                    .filter(key => key.length > 0);

                if (keys.length === 0) {
                    return res.status(200).send([]);
                }

                const entries = await Serami.findAll({
                    where: { key: keys }
                });
                res.status(200).send(entries);
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.get('/serami/export-translations/:id', UserRequired, async (req, res) => {
            try {
                const entry = await Serami.findByPk(req.params.id);
                if (!entry) {
                    return res.status(404).send({ message: 'Serami configuration not found' });
                }

                const csv = buildSeramiTranslationsCsv(entry);
                const filename = buildExportFilename(entry);
                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.status(200).send(csv);
            } catch (ex) {
                res.status(500).send({ message: ex.message });
            }
        });

        app.post('/chunkupload', UserRequired, async (req, res) => {
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

        app.listen(PORT, (error) => {
            if (!error)
                console.log("Server is Successfully Running, and App is listening on port " + PORT)
            else
                throw error;
        });
    } catch (e) {
        console.log(e);
    }

}

init().then(() => console.log("INIT DONE"));

async function getLastRegistry(serial)
{
    const registries = await Registry.findAll(
        {
            where: {
                serial: serial
            },
            order: [["createdAt", "DESC"]]
        });
    return (registries.length > 0) ? registries[0] : null;
}

async function makePost(hostname, path, method, data, headers={})
{
    return new Promise((resolve, reject) => {
        let postData = JSON.stringify(data);
        const opt = {
            hostname: hostname,
            path: path,
            method: method,
            rejectUnauthorized: false,
            headers: {
                ...headers,
            }
        };
        const req = https.request(opt, (res) => {
            const chunks = [];

            res.on('data', (chunk) => {
                chunks.push(chunk);
            });

            res.on('end', () => {
                const body = Buffer.concat(chunks).toString();

                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`Request failed with status ${res.statusCode}: ${body.slice(0, 200)}`));
                    return;
                }

                if (!body) {
                    resolve({});
                    return;
                }

                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(new Error(`Invalid JSON response: ${body.slice(0, 200)}`));
                }
            });
        });
        
        req.on('error', (e) => {
            reject(e);
        });
        
        req.write(postData);
        req.end();
    })
}

async function sendEmail(data, hostname, token, language=undefined)
{
    const path = '/wp-json/caiman/v1/email';
    const method = 'POST';
    const contentType = 'application/json';
    const headers = {'Content-Type': contentType, 'Authorization': 'Bearer ' + token}
    if(language)
        headers['Language'] = language;
    return await makePost(hostname, path, method, data, headers);
}