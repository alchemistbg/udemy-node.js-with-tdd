const Sequelize = require('sequelize');

const sequelize = new Sequelize('hoaxify', 'dbUser', 'dbPass', {
	dialect: 'sqlite',
	storage: './database.sqlite',
});

module.exports = sequelize;
