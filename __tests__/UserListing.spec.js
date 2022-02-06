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

describe('+++ Test listing users functionality +++', () => {
	it('returns 200 OK when there are no users in the database', async () => {
		const response = await supertest(app).get('/api/1.0/users');
		expect(response.status).toBe(200);
	});

	it('returns page object as response body', async () => {
		const response = await getUsers();
		expect(response.body).toEqual({
			totalPages: 0,
			currentPage: 0,
			pageSize: 10,
			users: [],
		});
	});

	it('returns 10 users in a single when there are 11 users in the database', async () => {
		await addUsers(11);
		const response = await getUsers();
		expect(response.body.users.length).toBe(10);
	});
});

