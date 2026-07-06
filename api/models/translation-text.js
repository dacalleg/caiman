module.exports = (sequelize, DataTypes) =>
    sequelize.define('translation_text', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        owner_type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        owner_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        field: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        language: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '',
        },
    }, {
        indexes: [
            { unique: true, fields: ['owner_type', 'owner_id', 'field', 'language'] },
        ],
    });
