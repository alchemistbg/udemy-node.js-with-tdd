const supertest = require('supertest');
const { SMTPServer } = require('smtp-server');

const app = require('../src/app');

const User = require('../src/user/User');
const sequelize = require('../src/config/database');

const en = require('../locales/en/translation.json');
const bg = require('../locales/bg/translation.json');

const validUser = {
	username: 'user1',
	email: 'user1@mail.com',
	password: 'P4ssword',
};

const postUser = (user = validUser, options = {}) => {
	const agent = supertest(app).post('/api/1.0/users');
	if (options.language) {
		agent.set('Accept-Language', options.language);
	}
	return agent.send(user);
};

let lastMail, server;
let simulateSmtpFailure = false;

beforeAll(async () => {
	server = new SMTPServer({
		authOptional: true,
		onData(stream, session, callback) {
			let mailBody;
			stream.on('data', (data) => {
				mailBody += data.toString();
			});
			stream.on('end', () => {
				if (simulateSmtpFailure) {
					const error = new Error('Invalid mailbox');
					error.responseCode = 553;
					return callback(error);
				}
				lastMail = mailBody;
				callback();
			});
		},
	});
	await server.listen(8587, 'localhost');

	await sequelize.sync();

	jest.setTimeout(20000);
});

beforeEach(async () => {
	simulateSmtpFailure = false;

	await User.destroy({
		truncate: true,
		restartIdentity: true,
	});
});

afterAll(async () => {
	await server.close();

	jest.setTimeout(5000);
});

describe('+++ Test user registration functionality +++', () => {
	it('return 200 when signup request is valid', async () => {
		const response = await postUser();
		expect(response.status).toBe(200);
	});

	it('return success message when signup request is valid', async () => {
		const response = await postUser();
		expect(response.body.message).toBe(en.user_created);
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
		const response = await postUser({ ...validUser, username: null });
		expect(response.status).toBe(400);
	});

	it('returns validationErrors field in the response body when validation error occurs', async () => {
		const response = await postUser({ ...validUser, username: null });
		const body = response.body;
		expect(body.validationErrors).not.toBeUndefined();
	});

	it('returns errors when both username and email are null', async () => {
		const response = await postUser({ ...validUser, username: null, email: null });
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

	// const username_null = 'Username cannot be null!';
	// const username_size = 'Must have min 4 and max 32 characters!';
	// const email_null = 'Email cannot be null!';
	// const email_invalid = 'Email must be a valid email!';
	// const email_inuse = 'Email already in use!';
	// const password_null = 'Password cannot be null!';
	// const password_size = 'Must have min 8 and max 16 characters!';
	// const password_pattern = 'Password must have at least 1 uppercase, 1 lowercase letter as well as 1 number!';
	// const email_failure = 'Email failure!';

	// Second form of each
	it.each`
		field         | value               | expectedMessage
		${'username'} | ${null}             | ${en.username_null}
		${'username'} | ${'usr'}            | ${en.username_size}
		${'username'} | ${'u'.repeat(33)}   | ${en.username_size}
		${'email'}    | ${null}             | ${en.email_null}
		${'email'}    | ${'mail.com'}       | ${en.email_invalid}
		${'email'}    | ${'user1.mail.com'} | ${en.email_invalid}
		${'email'}    | ${'user1@mail'}     | ${en.email_invalid}
		${'password'} | ${null}             | ${en.password_null}
		${'password'} | ${'P4sswor'}        | ${en.password_size}
		${'password'} | ${'p'.repeat(17)}   | ${en.password_size}
		${'password'} | ${'alllowercase'}   | ${en.password_pattern}
		${'password'} | ${'ALLUPPERCASE'}   | ${en.password_pattern}
		${'password'} | ${'123456789'}      | ${en.password_pattern}
		${'password'} | ${'lowerUPPER'}     | ${en.password_pattern}
		${'password'} | ${'lower4nd5678'}   | ${en.password_pattern}
		${'password'} | ${'UPPER1234567'}   | ${en.password_pattern}
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

	it(`returns ${en.email_inuse} message when email is already in use`, async () => {
		await User.create({ ...validUser });
		const response = await postUser();
		expect(response.body.validationErrors.email).toBe(en.email_inuse);
	});

	it('returns errors when both username is null and the email is already in use', async () => {
		await User.create({ ...validUser });
		const response = await postUser({
			username: null,
			email: validUser.email,
			password: validUser.password,
		});

		const body = response.body;
		expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
	});

	it('creates user in inactive mode', async () => {
		await postUser();
		const users = await User.findAll();
		const savedUser = users[0];
		expect(savedUser.inactive).toBe(true);
	});

	it('creates user in inactive mode even when body contains inactive set to false', async () => {
		const activeUser = { ...validUser, inactive: false };
		await postUser(activeUser);
		const users = await User.findAll();
		const savedUser = users[0];
		expect(savedUser.inactive).toBe(true);
	});

	it('creates activation token when registering user', async () => {
		await postUser();
		const users = await User.findAll();
		const savedUser = users[0];
		expect(savedUser.activationToken).toBeTruthy();
	});

	it('sends and Account activation email with activationToken', async () => {
		await postUser();
		const users = await User.findAll();
		const savedUser = users[0];
		expect(lastMail).toContain(validUser.email);
		expect(lastMail).toContain(savedUser.activationToken);
	});

	it('returns 502 Bad Gateway when sending activation email fails', async () => {
		simulateSmtpFailure = true;
		const response = await postUser();
		expect(response.status).toBe(502);
	});

	it('returns Email failure when sending activation email fails', async () => {
		simulateSmtpFailure = true;
		const response = await postUser();
		expect(response.body.message).toBe(en.email_failure);
	});

	it('does not save user to the database if sending activation email fails', async () => {
		simulateSmtpFailure = true;
		await postUser();
		const users = await User.findAll();
		expect(users.length).toBe(0);
	});

	it('returns validation failure message when validation error occurs ', async () => {
		const response = await postUser({ ...validUser, username: null });
		expect(response.body.message).toBe(en.validation_failure);
	});
});

describe('+++ Test error object +++', () => {
	it('returns path, timestamp, message and validation errors if validation failure occurs', async () => {
		const response = await postUser({ ...validUser, username: null });
		expect(Object.keys(response.body)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
	});

	it('returns path, timestamp and message when request fails and no validation failure occurs', async () => {
		const token = 'this-is-nonexisting-token';
		const response = await supertest(app).post(`/api/1.0/users/activation/${token}`).send();
		expect(Object.keys(response.body)).toEqual(['path', 'timestamp', 'message']);
	});

	it('returns path in error body', async () => {
		const token = 'this-is-nonexisting-token';
		const response = await supertest(app).post(`/api/1.0/users/activation/${token}`).send();
		expect(response.body.path).toEqual(`/api/1.0/users/activation/${token}`);
	});

	it('returns timestamp in milliseconds within 5 seconds in error body', async () => {
		const nowMillis = new Date().getTime();
		const nowMillisAfterFiveSeconds = nowMillis + 5 * 1000;
		const token = 'this-is-nonexisting-token';
		const response = await supertest(app).post(`/api/1.0/users/activation/${token}`).send();
		expect(response.body.timestamp).toBeGreaterThan(nowMillis);
		expect(response.body.timestamp).toBeLessThan(nowMillisAfterFiveSeconds);
	});
});

describe('+++ Test user account activation +++', () => {
	it('activates user account if correct token is sent', async () => {
		await postUser();
		let users = await User.findAll();
		const user = users[0];
		const token = user.activationToken;

		await supertest(app).post(`/api/1.0/users/activation/${token}`).send();

		users = await User.findAll();
		const activatedUser = users[0];
		expect(activatedUser.inactive).toBe(false);
	});

	it('removes the token after successful activation', async () => {
		await postUser();
		let users = await User.findAll();
		const user = users[0];
		const token = user.activationToken;

		await supertest(app).post(`/api/1.0/users/activation/${token}`).send();

		users = await User.findAll();
		const activatedUser = users[0];
		expect(activatedUser.activationToken).toBeFalsy();
	});

	it('does not activate the account when token is wrong', async () => {
		await postUser();
		const token = 'this-is-nonexisting-token';

		await supertest(app).post(`/api/1.0/users/activation/${token}`).send();

		const users = await User.findAll();
		const activatedUser = users[0];
		expect(activatedUser.inactive).toBe(true);
	});

	it('return Bad request when token is wrong', async () => {
		await postUser();
		const token = 'this-is-nonexistent-token';

		const response = await supertest(app).post(`/api/1.0/users/activation/${token}`).send();

		expect(response.status).toBe(400);
	});

	it.each`
		language | tokenStatus  | message
		${'en'}  | ${'wrong'}   | ${en.account_activation_failure}
		${'bg'}  | ${'wrong'}   | ${bg.account_activation_failure}
		${'en'}  | ${'correct'} | ${en.account_activation_success}
		${'bg'}  | ${'correct'} | ${bg.account_activation_success}
	`(
		'returns $message when $tokenStatus token is sent and the language is $language',
		async ({ language, tokenStatus, message }) => {
			await postUser();
			let token = 'this-is-nonexistent-token';
			if (tokenStatus === 'correct') {
				const users = await User.findAll();
				const user = users[0];
				token = user.activationToken;
			}

			const response = await supertest(app)
				.post(`/api/1.0/users/activation/${token}`)
				.set('Accept-Language', language)
				.send();
			expect(response.body.message).toBe(message);
		}
	);
});

describe('+++ Test internationalization functionality +++', () => {
	// const username_null = 'Потребителското име не може да е празно!';
	// const username_size = 'Дължината на потребителското име трябва да е между 4 и 32 символа';
	// const email_null = 'Електронната поща не може да е празна!';
	// const email_invalid = 'Електронната поща трябва да е валидна!';
	// const email_inuse = 'Електронната поща вече е регистрирана!';
	// const password_null = 'Паролата не може да е празна!';
	// const password_size = 'Дължината на паролата трябва да е между 8 и 16 символа!';
	// const password_pattern = 'Паролата трябва да съдържа поне 1 главна буква, 1 малка буква и 1 цифра!';
	// const email_failure = 'Писмото не е изпратено!';
	// const validation_failure = 'Грешка при валидирането на данните!';

	// const user_created = 'Потребителят е създаден успешно!';

	// Second form of each
	it.each`
		field         | value               | expectedMessage
		${'username'} | ${null}             | ${bg.username_null}
		${'username'} | ${'usr'}            | ${bg.username_size}
		${'username'} | ${'u'.repeat(33)}   | ${bg.username_size}
		${'email'}    | ${null}             | ${bg.email_null}
		${'email'}    | ${'mail.com'}       | ${bg.email_invalid}
		${'email'}    | ${'user1.mail.com'} | ${bg.email_invalid}
		${'email'}    | ${'user1@mail'}     | ${bg.email_invalid}
		${'password'} | ${null}             | ${bg.password_null}
		${'password'} | ${'P4sswor'}        | ${bg.password_size}
		${'password'} | ${'p'.repeat(17)}   | ${bg.password_size}
		${'password'} | ${'alllowercase'}   | ${bg.password_pattern}
		${'password'} | ${'ALLUPPERCASE'}   | ${bg.password_pattern}
		${'password'} | ${'123456789'}      | ${bg.password_pattern}
		${'password'} | ${'lowerUPPER'}     | ${bg.password_pattern}
		${'password'} | ${'lower4nd5678'}   | ${bg.password_pattern}
		${'password'} | ${'UPPER1234567'}   | ${bg.password_pattern}
	`(
		'returns $expectedMessage when $field is $value when selected language is BG',
		async ({ field, value, expectedMessage }) => {
			const user = {
				username: 'user1',
				email: 'user1@email.com',
				password: 'P4ssword',
			};

			user[field] = value;
			const response = await postUser(user, { language: 'bg' });
			const body = response.body;
			expect(body.validationErrors[field]).toBe(expectedMessage);
		}
	);

	it(`returns ${bg.email_inuse} message when email is already in use when selected language is set to BG`, async () => {
		await User.create({ ...validUser });
		const response = await postUser(validUser, { language: 'bg' });
		expect(response.body.validationErrors.email).toBe(bg.email_inuse);
	});

	it(`return ${bg.user_created} when signup request is valid`, async () => {
		const response = await postUser(validUser, { language: 'bg' });
		expect(response.body.message).toBe(bg.user_created);
	});

	it(`returns ${bg.email_failure} message when sending activation email fails and the language is set to BG`, async () => {
		simulateSmtpFailure = true;
		const response = await postUser({ ...validUser }, { language: 'bg' });
		expect(response.body.message).toBe(bg.email_failure);
	});

	it(`returns ${bg.validation_failure} message when validation error occurs `, async () => {
		const response = await postUser({ ...validUser, username: null }, { language: 'bg' });
		expect(response.body.message).toBe(bg.validation_failure);
	});
});
