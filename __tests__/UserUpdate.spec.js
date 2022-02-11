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

});
