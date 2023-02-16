
module.exports = (sequelize, DataTypes) => {
    const Asset = sequelize.define('assets', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        path: {
            type: DataTypes.STRING,
            allowNull: false
        },
    }, {})
    const Ticket = sequelize.define('tickets', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true
        },
        device: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        status: {
            type: DataTypes.STRING(10),
            allowNull: true
        },
        text: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        customer: {
            type: DataTypes.BOOLEAN,
        }
    }, {
        indexes: [
            {
                unique: false,
                fields: ['device']
            }
        ]
    })

    Ticket.belongsTo(Ticket, { foreignKey: 'parent_id', as: 'parent' });
    Asset.belongsTo(Ticket, { foreignKey: 'ticket_id' });
    Ticket.hasMany(Asset, { foreignKey: 'ticket_id'});

    return { Ticket, Asset }
};