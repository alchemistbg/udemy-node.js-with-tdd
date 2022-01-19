const supertest = require('supertest');

const app = require('../src/app');

const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(() => {
	return sequelize.sync();
});

beforeEach(() => {
	return User.destroy({
		truncate: true,
		restartIdentity: true,
	});
});

describe('Test user registration functionality', () => {
	const postValidUser = () => {
		return supertest(app).post('/api/1.0/users').send({
			username: 'user1',
			email: 'user1@mail.com',
			password: 'P4ssword',
		});
	};

	it('return 200 when signup request is valid', async () => {
		const response = await postValidUser();
		expect(response.status).toBe(200);
	});

	it('return success message when signup request is valid', async () => {
		const response = await postValidUser();
		expect(response.body.message).toBe('User created');
	});

	it('saves user to the database', async () => {
		await postValidUser();
		const userList = await User.findAll();
		expect(userList.length).toBe(1);
	});

	it('saves username and email to the database', async () => {
		await postValidUser();
		const userList = await User.findAll()
		const savedUser = userList[0];
		expect(savedUser.username).toBe('user1');
		expect(savedUser.email).toBe('user1@mail.com');
	});

	it('hashes password when saving user to the database', async () => {
		await postValidUser();
		const userList = await User.findAll();
		const savedUser = userList[0];
		expect(savedUser.password).not.toBe('P4ssword');
	});
});
