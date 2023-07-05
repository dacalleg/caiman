
module.exports = (sequelize, DataTypes) => {
    const Serami = sequelize.define('serami', {
        key: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        data: {
            type: DataTypes.TEXT,
            get: function () {
                return JSON.parse(this.getDataValue('data'));
            },
            set: function (data) {
                this.setDataValue('data', JSON.stringify(data));
            }
        }
    });
    const Log = sequelize.define('logs', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        user: {
            type: DataTypes.STRING,
            allowNull: false
        },
        type: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        data: {
            type: DataTypes.STRING,
            allowNull: true
        },
        from: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        set: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        written: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        variable: {
            type: DataTypes.STRING,
            allowNull: true
        },
        gateway: {
            type: DataTypes.STRING,
            allowNull: true
        },
        serial: {
            type: DataTypes.STRING,
            allowNull: true
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        timestamps: false,
        indexes: [
            {
                unique: false,
                fields: ['serial', 'gateway']
            }
        ]
    });
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
        serial: {
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
                fields: ['serial']
            }
        ]
    })

    Ticket.belongsTo(Ticket, { foreignKey: 'parent_id', as: 'parent' });
    Asset.belongsTo(Ticket, { foreignKey: 'ticket_id' });
    Ticket.hasMany(Asset, { foreignKey: 'ticket_id' });

    return { Ticket, Asset, Log, Serami }
};