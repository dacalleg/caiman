const jwt = require('jsonwebtoken');

module.exports = function createUserRequired(jwtKey) {
    return (req, res, next) => {
        if (!req.headers.authorization) {
            return res.sendStatus(403);
        }

        let token = req.headers.authorization;
        if (req.headers.authorization.split(' ')[0] === 'Bearer') {
            token = req.headers.authorization.split(' ')[1];
        }

        jwt.verify(token, jwtKey, function (err, decoded) {
            if (err) {
                return res.sendStatus(403);
            }
            req.token = token;
            req.user = decoded;
            next();
        });
    };
};
