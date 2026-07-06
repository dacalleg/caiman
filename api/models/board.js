module.exports = (sequelize, DataTypes) =>
    sequelize.define('board', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        serami_id: {
            type: DataTypes.UUID,
            allowNull: true,
            unique: true,
            references: {
                model: 'serami',
                key: 'id'
            }
        }
    });
