
module.exports = (sequelize, DataTypes) => {
    const Registry = sequelize.define('registry', {
        key: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        user: {
            type: DataTypes.STRING,
            allowNull: false
        },
        serial: {
            type: DataTypes.STRING,
            allowNull: true
        },
        fiscal_code: {
            type: DataTypes.STRING,
            allowNull: true
        },
        business_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        surname: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false
        },
        address: {
            type: DataTypes.STRING,
            allowNull: false
        },
        street_number: {
            type: DataTypes.STRING,
            allowNull: true
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false
        },
        mobile: {
            type: DataTypes.STRING,
            allowNull: true
        },
        city: {
            type: DataTypes.STRING,
            allowNull: false
        },
        province: {
            type: DataTypes.STRING,
            allowNull: true
        },
        zip: {
            type: DataTypes.STRING,
            allowNull: true
        },
        country: {
            type: DataTypes.STRING,
            allowNull: false
        },
        purchase_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        first_ignition_date:{
            type: DataTypes.DATE,
            allowNull: true
        },
        dealer: {
            type: DataTypes.STRING,
            allowNull: true
        },
        invoice: {
            type: DataTypes.STRING,
            allowNull: true
        },
        warranty: {
            type: DataTypes.STRING,
            allowNull: true
        },
    },
    {
        indexes: [
            {
                unique: false,
                fields: ['serial']
            },
            {
                unique: false,
                fields: ['user']
            }
        ]
    });
    const Operation = sequelize.define('operation',
    {
        key: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        serial: {
            type: DataTypes.STRING,
            allowNull: true
        },
        user: {
            type: DataTypes.STRING,
            allowNull: false
        },
        confirmed_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        email_confirmed: {
            type: DataTypes.BOOLEAN,
        },
        web_confirmed: {
            type: DataTypes.BOOLEAN,
        },
        data: {
            type: DataTypes.TEXT('long'),
            get: function () {
                const data = this.getDataValue('data');
                if(data)
                    return JSON.parse(data);
                return null;
            },
            set: function (data) {
                this.setDataValue('data', JSON.stringify(data));
            }
        }
    },
    {
        indexes: [
            {
                unique: false,
                fields: ['serial']
            },
            {
                unique: false,
                fields: ['user']
            }
        ]
    }
    );
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
            type: DataTypes.TEXT('long'),
            get: function () {
                const data = this.getDataValue('data');
                if(data)
                    return JSON.parse(data);
                return null;
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

    return { Ticket, Asset, Log, Serami, Registry, Operation }
};