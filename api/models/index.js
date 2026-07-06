const defineDatabase = require('./database');
const defineProduct = require('./product');
const defineBoard = require('./board');
const defineTranslationText = require('./translation-text');

module.exports = (sequelize, DataTypes) => {
    const Board = defineBoard(sequelize, DataTypes);
    const Product = defineProduct(sequelize, DataTypes);
    const Database = defineDatabase(sequelize, DataTypes);
    const TranslationText = defineTranslationText(sequelize, DataTypes);

    Board.hasMany(Database, { foreignKey: 'board_id', as: 'database' });
    Database.belongsTo(Board, { foreignKey: 'board_id' });

    Board.hasMany(Product, { foreignKey: 'board_id', as: 'products' });
    Product.belongsTo(Board, { foreignKey: 'board_id' });

    Product.hasMany(TranslationText, {
        foreignKey: 'owner_id',
        constraints: false,
        scope: { owner_type: 'product', field: 'name' },
        as: 'nameTranslations',
    });
    Product.hasMany(TranslationText, {
        foreignKey: 'owner_id',
        constraints: false,
        scope: { owner_type: 'product', field: 'description' },
        as: 'descriptionTranslations',
    });

    return { Board, Product, Database, TranslationText };
};
