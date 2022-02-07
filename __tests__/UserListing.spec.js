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

	it('returns 6 users in a single page when there are 6 active and 5 inactive in the database', async () => {
		await addUsers(6, 5);
		const response = await getUsers();
		expect(response.body.users.length).toBe(6);
	});

	it('returns only id, username and email in users array', async () => {
		await addUsers(6, 5);
		const response = await getUsers();
		const user = response.body.users[0];
		expect(Object.keys(user)).toEqual(['id', 'username', 'email']);
	});

	it('return 2 as totalPages when there are 15 active and 7 inactive users', async () => {
		await addUsers(15, 7);
		const response = await getUsers();
		expect(response.body.totalPages).toBe(2);
	});

	it('returns second page and page indicator when page is set as 1 in request parameter', async () => {
		// TODO: change the test for 1-base pagination
		await addUsers(11);

		// const response = await supertest(app).get('/api/1.0/users?page=1');
		const response = await getUsers().query({ page: 1 });
		expect(response.body.currentPage).toBe(1);
		expect(response.body.users[0].username).toBe('user11');
	});

	it('returns first page when the page is set below 0 as query parameter', async () => {
		await addUsers(11);

		// const response = await supertest(app).get('/api/1.0/users?page=1');
		const response = await getUsers().query({ page: -51 });
		expect(response.body.currentPage).toBe(0);
	});

	it('returns 5 users and corresponding size indicator when the page size is set to 5 as request parameter', async () => {
		await addUsers(11);
		const response = await getUsers().query({ size: 5 });
		expect(response.body.users.length).toBe(5);
		expect(response.body.pageSize).toBe(5);
	});

	it('returns 10 users and corresponding size indicator when the page size is set to 1000 as request parameter', async () => {
		await addUsers(11);
		const response = await getUsers().query({ size: 1000 });
		expect(response.body.users.length).toBe(10);
		expect(response.body.pageSize).toBe(10);
	});

});

