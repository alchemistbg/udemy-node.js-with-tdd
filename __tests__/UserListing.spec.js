const supertest = require('supertest');
const app = require('../src/app');

const User = require('../src/user/User');
const sequelize = require('../src/config/database');

const en = require('../locales/en/translation.json');
const bg = require('../locales/bg/translation.json');

const addUsers = async (aUsers, iUsers = 0) => {
	for (let u = 0; u < aUsers + iUsers; u++) {
		const user = {
			username: `user${u + 1}`,
			email: `user${u + 1}@mail.com`,
			inactive: u >= aUsers,
		};
		await User.create(user);
	}
};

const getUsers = () => {
	return supertest(app).get('/api/1.0/users');
};

const getUser = (userId = 5) => {
	return supertest(app).get(`/api/1.0/users/${userId}`);
};

beforeAll(async () => {
	await sequelize.sync();
});

beforeEach(async () => {
	await User.destroy({
		truncate: true,
		restartIdentity: true,
	});
});
