const bcrypt = require('bcrypt');

const User = require('./User');

const save = async (body) => {
	const hash = await bcrypt.hash(body.password, 10);
	// First way to create user object
	const user = { ...body, password: hash };
	
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
}

const findByEmail = async (email) => {
	return await User.findOne({ where: { email: email } });
};

module.exports = {
	save,
	findByEmail,
};
