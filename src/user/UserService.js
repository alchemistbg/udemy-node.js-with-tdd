const bcrypt = require('bcrypt');
const crypto = require('crypto');
const sequelize = require('../config/database');

const User = require('./User');
const EmailService = require('../email/EmailService');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./InvalidTokenException');

const generateToken = (length) => {
	// return crypto.randomBytes(length).toString('hex');
	return crypto.randomBytes(length).toString('hex').substring(0, length);
};

const saveUser = async (body) => {
	const { username, email, password } = body;
	const hash = await bcrypt.hash(password, 10);
	// First way to create user object
	const user = { username, email, password: hash, activationToken: generateToken(16) };

	// Second way to create user object
	// const user = {
	// 	username: req.body.username,
	// 	email: req.username.email,
	// 	password: hash,
	// }

	// Third way to create user object
	// const user = Object.assign({}, req.body, {
	// 	password: hash,
	// });

	const transaction = await sequelize.transaction();
	await User.create(user, { transaction });
	try {
		await EmailService.sendAccountActivationEmail(user.email, user.activationToken);
		await transaction.commit();
	} catch (error) {
		await transaction.rollback();
		throw new EmailException();
	}
};

const activateUser = async (token) => {
	const user = await User.findOne({ where: { activationToken: token } });
	if (!user) {
		throw new InvalidTokenException();
	}
	user.inactive = false;
	user.activationToken = null;
	await user.save();
};

const findUserByEmail = async (email) => {
	return await User.findOne({ where: { email: email } });
};

const getUsers = async (currentPage, pageSize) => {
	// TODO: change the function for 1-base pagination
	const usersWithCount = await User.findAndCountAll({
		where: { inactive: false },
		attributes: ['id', 'username', 'email'],
		limit: pageSize,
		offset: currentPage * pageSize,
	});

	const totalPages = Math.ceil(usersWithCount.count / pageSize);

	return {
		totalPages: totalPages,
		currentPage,
		pageSize,
		users: usersWithCount.rows,
	};
};

const getUser = async (userId) => {
	const user = await User.findOne({
		where: {
			id: userId,
			inactive: false,
		},
		attributes: ['id', 'username', 'email'],
	});
	if (!user) {
		throw new UserNotFoundException();
	}
	return user;
};

module.exports = {
	saveUser,
	activateUser,
	findUserByEmail,
	getUsers,
};
