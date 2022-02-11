const supertest = require('supertest');
const bcrypt = require('bcrypt');

const app = require('../src/app');
const sequelize = require('../src/config/database');
const User = require('../src/user/User');

const en = require('../locales/en/translation.json');
const bg = require('../locales/bg/translation.json');

const endPoint = '/api/1.0/users';

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

const putUser = (id = 5, body = null, options = {}) => {
	const agent = supertest(app).put(`${endPoint}/${id}`);
	if (options.language) {
		agent.set('Accept-Language', options.language);
	}

	if (options.auth) {
		const { email, password } = options.auth;
		// const merged = `${email}:${password}`;
		// const base64 = Buffer.from(merged).toString('base64');
		// console.log(base64);
		agent.auth(email, password);
	}
	return agent.send(body);
};

beforeAll(async () => {
	await sequelize.sync();
});

beforeEach(async () => {
	await User.destroy({ truncate: true });
});

describe('+++ Testing user update +++', () => {
	it('returns forbidden when the request is sent without authorization ', async () => {
		const response = await putUser();
		expect(response.status).toBe(403);
	});

	it.each`
		language | message
		${'en'}  | ${en.unauthorized_user_update}
		${'bg'}  | ${bg.unauthorized_user_update}
	`(
		'returns error body with $message for unauthorized request when the language is set to $language',
		async ({ language, message }) => {
			const nowInMillis = new Date().getTime();
			// const response = await supertest(app).put('/api/1.0/users/5').set('Accept-Language', language).send();
			const response = await putUser(5, null, { language });
			expect(response.body.path).toBe('/api/1.0/users/5');
			expect(response.body.message).toBe(message);
			expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
		}
	);

	it('returns 403 when request is sent with incorrect email in base64 authorization', async () => {
		await addUser();
		const response = await putUser(5, null, {
			auth: { email: activeUser.email, password: activeUser.password },
		});
		expect(response.status).toBe(403);
	});

	it('returns 403 when request is sent with incorrect password in base64 authorization', async () => {
		await addUser();
		const response = await putUser(5, null, {
			auth: { email: activeUser.email, password: activeUser.password },
		});
		expect(response.status).toBe(403);
	});

	it('returns 403 when request is sent with correct correct credentials but for another user', async () => {
		await addUser();
		const userToBeUpdated = await addUser({ ...activeUser, username: 'user2', email: 'user2@mail.com' });

		const response = await putUser(userToBeUpdated.id, null, {
			auth: { email: activeUser.email, password: activeUser.password },
		});
		expect(response.status).toBe(403);
	});

	it('returns 403 when request is sent by inactive user with correct credentials', async () => {
		const inactiveUser = await addUser({ ...activeUser, inactive: true });
		const response = await putUser(inactiveUser.id, null, {
			auth: { email: inactiveUser.email, password: inactiveUser.password },
		});
		expect(response.status).toBe(403);
	});

	it('returns 200 when valid request for updating is sent', async () => {
		const savedUser = await addUser();
		const validUpdate = { username: 'user1-updated' };
		const response = await putUser(savedUser.id, validUpdate, {
			auth: { email: savedUser.email, password: 'P4ssword' },
		});
		expect(response.status).toBe(200);
	});

	it('updates username in database when valid request for updating is sent', async () => {
		const savedUser = await addUser();
		const validUpdate = { username: 'user1-updated' };
		await putUser(savedUser.id, validUpdate, {
			auth: { email: savedUser.email, password: 'P4ssword' },
		});

		const updatedUser = await User.findOne({ where: { id: savedUser.id } });
		expect(updatedUser.username).toBe(validUpdate.username);
	});
});
