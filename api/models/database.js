module.exports = (sequelize, DataTypes) =>
    sequelize.define('param_database', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        board_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'board',
                key: 'id'
            }
        },
        roles: {
            type: DataTypes.TEXT('long'),
            allowNull: false,
            defaultValue: '[]',
            get: function () {
                const roles = this.getDataValue('roles');
                if (roles) {
                    return JSON.parse(roles);
                }
                return [];
            },
            set: function (roles) {
                this.setDataValue('roles', JSON.stringify(roles));
            }
        },
        values: {
            type: DataTypes.TEXT('long'),
            allowNull: false,
            defaultValue: '[]',
            get: function () {
                const values = this.getDataValue('values');
                if (values) {
                    return JSON.parse(values);
                }
                return [];
            },
            set: function (values) {
                this.setDataValue('values', JSON.stringify(values));
            }
        }
    }, {
        indexes: [
            { unique: false, fields: ['board_id'] }
        ]
    });
