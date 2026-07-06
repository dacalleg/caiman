module.exports = (sequelize, DataTypes) =>
    sequelize.define('product', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        agua_key: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        board_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'board',
                key: 'id'
            }
        }
    });
