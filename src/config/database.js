const Sequelize = require('sequelize');

const sequelize = new Sequelize('hoaxify', 'dbUser', 'dbPass', {
	dialect: 'sqlite',
	storage: './database.sqlite',
	logging: false,
});

module.exports = sequelize;
