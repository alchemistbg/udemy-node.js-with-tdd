const supertest = require('supertest');
const bcrypt = require('bcrypt');

const app = require('../src/app');
const sequelize = require('../src/config/database');
const User = require('../src/user/User');

const en = require('../locales/en/translation.json');
const bg = require('../locales/bg/translation.json');

const endPoint = '/api/1.0/auth';

const activeUser = {
	username: 'user1',
	email: 'user1@mail.com',
	password: 'P4ssword',
	inactive: false,
};

const addUser = async (user = { ...activeUser }) => {
	const hashedPassword = await bcrypt.hash(user.password, 10);
	user.password = hashedPassword;
	return await User.create({ ...user });
};

const postAuthentication = async (credentials, options = {}) => {
	const agent = supertest(app).post(endPoint);
	if (options.language) {
		agent.set('Accept-Language', options.language);
	}
	return await agent.send(credentials);
};

beforeAll(async () => {
	await sequelize.sync();
});

beforeEach(async () => {
	await User.destroy({ truncate: true });
});
