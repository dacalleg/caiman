const { Sequelize, DataTypes } = require('sequelize');
const createUserRequired = require('./middleware/userRequired');
const defineModels = require('./models');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        dialect: 'mariadb',
        host: process.env.DB_HOST,
        dialectOptions: {}
    }
);

const { Board, Product, Database, TranslationText } = defineModels(sequelize, DataTypes);
const UserRequired = createUserRequired(process.env.JWT_AUTH_SECRET_KEY);

module.exports = {
    sequelize,
    UserRequired,
    Board,
    Product,
    Database,
    TranslationText,
};
