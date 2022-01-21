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

const validUser = {
	username: 'user1',
	email: 'user1@mail.com',
	password: 'P4ssword',
};

const postUser = (user = validUser) => {
	return supertest(app).post('/api/1.0/users').send(user);
};

describe('Test user registration functionality', () => {
	it('return 200 when signup request is valid', async () => {
		const response = await postUser();
		expect(response.status).toBe(200);
	});

	it('return success message when signup request is valid', async () => {
		const response = await postUser();
		expect(response.body.message).toBe('User created');
	});

	it('saves user to the database', async () => {
		await postUser();
		const userList = await User.findAll();
		expect(userList.length).toBe(1);
	});

	it('saves username and email to the database', async () => {
		await postUser();
		const userList = await User.findAll();
		const savedUser = userList[0];
		expect(savedUser.username).toBe('user1');
		expect(savedUser.email).toBe('user1@mail.com');
	});

	it('hashes password when saving user to the database', async () => {
		await postUser();
		const userList = await User.findAll();
		const savedUser = userList[0];
		expect(savedUser.password).not.toBe('P4ssword');
	});

	it('returns 400 when username is null', async () => {
		const response = await postUser({
			username: null,
			email: 'user1@mail.com',
			password: 'P4ssword',
		});
		expect(response.status).toBe(400);
	});

	it('returns validationErrors field in the response body when validation error occurs', async () => {
		const response = await postUser({
			username: null,
			email: 'user1@mail.com',
			password: 'P4ssword',
		});
		const body = response.body;
		expect(body.validationErrors).not.toBeUndefined();
	});

	it('returns errors when both username and email are null', async () => {
		const response = await postUser({
			username: null,
			email: null,
			password: 'P4ssword',
		});
		const body = response.body;
		expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
	});

	// First form of each
	// it.each([
	// 	['username', 'Username cannot be null!'],
	// 	['email', 'Email cannot be null!'],
	// 	['password', 'Password cannot be null!']
	// ])('when %s is null, %s is received ', async (field, expectedMessage ) => {
	// 	const user = {
	// 		username: 'user1',
	// 		email: 'user1@email.com',
	// 		password: 'P4ssword',
	// 	};
	// 	user[field] = null;
	// 	const response = await postUser(user);
	// 	const body = response.body;
	// 	expect(body.validationErrors[field]).toBe(expectedMessage);
	// });

	// Second form of each
	it.each`
		field         | value               | expectedMessage
		${'username'} | ${null}             | ${'Username cannot be null!'}
		${'username'} | ${'usr'}            | ${'Must have min 4 and max 32 characters!'}
		${'username'} | ${'a'.repeat(33)}   | ${'Must have min 4 and max 32 characters!'}
		${'email'}    | ${null}             | ${'Email cannot be null!'}
		${'email'}    | ${'mail.com'}       | ${'Email must be a valid email!'}
		${'email'}    | ${'user1.mail.com'} | ${'Email must be a valid email!'}
		${'email'}    | ${'user1@mail'}     | ${'Email must be a valid email!'}
		${'password'} | ${null}             | ${'Password cannot be null!'}
		${'password'} | ${'P4sswor'}        | ${'Must have min 8 and max 16 characters!'}
		${'password'} | ${'p'.repeat(17)}   | ${'Must have min 8 and max 16 characters!'}
		${'password'} | ${'alllowercase'}   | ${'Password must have at least 1 uppercase, 1 lowercase letter as well as 1 number!'}
		${'password'} | ${'ALLUPPERCASE'}   | ${'Password must have at least 1 uppercase, 1 lowercase letter as well as 1 number!'}
		${'password'} | ${'123456789'}      | ${'Password must have at least 1 uppercase, 1 lowercase letter as well as 1 number!'}
		${'password'} | ${'lowerUPPER'}     | ${'Password must have at least 1 uppercase, 1 lowercase letter as well as 1 number!'}
		${'password'} | ${'lower4nd5678'}   | ${'Password must have at least 1 uppercase, 1 lowercase letter as well as 1 number!'}
		${'password'} | ${'UPPER1234567'}   | ${'Password must have at least 1 uppercase, 1 lowercase letter as well as 1 number!'}
	`('returns $expectedMessage when $field is $value', async ({ field, value, expectedMessage }) => {
		const user = {
			username: 'user1',
			email: 'user1@email.com',
			password: 'P4ssword',
		};

		user[field] = value;
		const response = await postUser(user);
		const body = response.body;
		expect(body.validationErrors[field]).toBe(expectedMessage);
	});

	it('returns Email already in use message when email is already in use', async () => {
		await User.create({ ...validUser });
		const response = await postUser();
		expect(response.body.validationErrors.email).toBe('Email already in use!');
	});

	it('returns errors when both username is null and the email is already in use', async () => {
		await User.create({ ...validUser });
		const response = await postUser({
			username: null,
			email: validUser.email,
			password: validUser.password,
		});

		const body = response.body;
		console.log(body.validationErrors);
		expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
	});
});
