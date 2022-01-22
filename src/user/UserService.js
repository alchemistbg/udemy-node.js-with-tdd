const bcrypt = require('bcrypt');
const crypto = require('crypto');

const User = require('./User');

const generateToken = (length) => {
	// return crypto.randomBytes(length).toString('hex');
	return crypto.randomBytes(length).toString('hex').substring(0, length);
}

const save = async (body) => {
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

	await User.create(user);
};

const findByEmail = async (email) => {
	return await User.findOne({ where: { email: email } });
};

module.exports = {
	save,
	findByEmail,
};
