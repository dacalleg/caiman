const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');

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
const { Ticket, Asset, Log } = require('./model')(sequelize, DataTypes);
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

        app.use(cors());
        app.use(bodyParser.json({ limit: '10mb' }));

        app.get('/healthcheck', (req, res) => {
            res.send(200);
        });

        app.post('/ticket/add', UserRequired, async (req, res) => {
            try {
                if (req.body.parent !== undefined) {
                    req.body.ticket["status"] = "open";
                }

                let obj = { ...req.body.ticket, email: req.user.email };
                const ticket = await Ticket.create(obj, { include: [ Asset ] });

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

        app.post('/ticket/get', UserRequired, async (req, res) => {
            try {
                const tickets = await Ticket.findAll(
                    {
                        where: {
                            serial: req.body.serial,
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
            const body = {...req.body, user: userId};
            try {
                const log = await Log.create(body);
                res.status(200).send({ status: "OK" });
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