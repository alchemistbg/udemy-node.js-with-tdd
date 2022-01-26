const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const Model = Sequelize.Model;

class User extends Model {}

// TODO: Need to make password required! The backend do password validation but database don't!
User.init(
	{
		username: {
			type: Sequelize.STRING,
		},
		email: {
			type: Sequelize.STRING,
			unique: true,
		},
		password: {
			type: Sequelize.STRING,
		},
		inactive: {
			type: Sequelize.BOOLEAN,
			defaultValue: true,
		},
		activationToken: {
			type: Sequelize.STRING,
		},
	},
	{
		sequelize,
		modelName: 'user',
	}
);

module.exports = User;
