const app = require('./src/app');
const bcrypt = require('bcrypt');

const User = require('./src/user/User');
const sequelize = require('./src/config/database');

const populateDatabase = async (aUsers, iUsers = 0) => {
	const hashedPassword = await bcrypt.hash('P4ssword', 10);
	for (let u = 0; u < aUsers + iUsers; u++) {
		const user = {
			username: `user${u + 1}`,
			email: `user${u + 1}@mail.com`,
			inactive: u >= aUsers,
			password: hashedPassword,
		};
		await User.create(user);
	}
};

sequelize.sync({ force: true }).then(async () => {
	await populateDatabase(25);
});

app.listen(3000, () => {
	console.log('Server is up and running on port 3000');
});
