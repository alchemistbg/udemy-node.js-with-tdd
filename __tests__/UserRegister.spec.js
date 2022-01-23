const supertest = require('supertest');
// const nodemailerStub = require('nodemailer-stub');
const { SMTPServer } = require('smtp-server');

const app = require('../src/app');

const User = require('../src/user/User');
const sequelize = require('../src/config/database');

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
});

beforeEach(() => {
	simulateSmtpFailure = false;

	return User.destroy({
		truncate: true,
		restartIdentity: true,
	});
});

afterAll(async () => {
	await server.close();
});

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

describe('+++ Test user registration functionality +++', () => {
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

	const username_null = 'Username cannot be null!';
	const username_size = 'Must have min 4 and max 32 characters!';
	const email_null = 'Email cannot be null!';
	const email_invalid = 'Email must be a valid email!';
	const email_inuse = 'Email already in use!';
	const password_null = 'Password cannot be null!';
	const password_size = 'Must have min 8 and max 16 characters!';
	const password_pattern = 'Password must have at least 1 uppercase, 1 lowercase letter as well as 1 number!';
	// const email_failure = 'Email failure!';

	// Second form of each
	it.each`
		field         | value               | expectedMessage
		${'username'} | ${null}             | ${username_null}
		${'username'} | ${'usr'}            | ${username_size}
		${'username'} | ${'u'.repeat(33)}   | ${username_size}
		${'email'}    | ${null}             | ${email_null}
		${'email'}    | ${'mail.com'}       | ${email_invalid}
		${'email'}    | ${'user1.mail.com'} | ${email_invalid}
		${'email'}    | ${'user1@mail'}     | ${email_invalid}
		${'password'} | ${null}             | ${password_null}
		${'password'} | ${'P4sswor'}        | ${password_size}
		${'password'} | ${'p'.repeat(17)}   | ${password_size}
		${'password'} | ${'alllowercase'}   | ${password_pattern}
		${'password'} | ${'ALLUPPERCASE'}   | ${password_pattern}
		${'password'} | ${'123456789'}      | ${password_pattern}
		${'password'} | ${'lowerUPPER'}     | ${password_pattern}
		${'password'} | ${'lower4nd5678'}   | ${password_pattern}
		${'password'} | ${'UPPER1234567'}   | ${password_pattern}
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

	it(`returns ${email_inuse} message when email is already in use`, async () => {
		await User.create({ ...validUser });
		const response = await postUser();
		expect(response.body.validationErrors.email).toBe(email_inuse);
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
		expect(response.body.message).toBe('Email Failure!');
	});
	
	it('does not save user to the database if sending activation email fails', async () => {
		simulateSmtpFailure = true;
		await postUser();
		const users = await User.findAll();
		expect(users.length).toBe(0);
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
		${'en'}  | ${'wrong'}   | ${'This account is either active or the token is invalid!'}
		${'bg'}  | ${'wrong'}   | ${'Този профил вече е активиран или токена е невалиден!'}
		${'en'}  | ${'correct'} | ${'The account was successfully activated!'}
		${'bg'}  | ${'correct'} | ${'Профилът беше активиран успешно!'}
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
	const username_null = 'Потребителското име не може да е празно!';
	const username_size = 'Дължината на потребителското име трябва да е между 4 и 32 символа';
	const email_null = 'Електронната поща не може да е празна!';
	const email_invalid = 'Електронната поща трябва да е валидна!';
	const email_inuse = 'Електронната поща вече е регистрирана!';
	const password_null = 'Паролата не може да е празна!';
	const password_size = 'Дължината на паролата трябва да е между 8 и 16 символа!';
	const password_pattern = 'Паролата трябва да съдържа поне 1 главна буква, 1 малка буква и 1 цифра!';
	const email_failure = 'Писмото не е изпратено!';

	const user_created = 'Потребителят е създаден успешно!';

	// Second form of each
	it.each`
		field         | value               | expectedMessage
		${'username'} | ${null}             | ${username_null}
		${'username'} | ${'usr'}            | ${username_size}
		${'username'} | ${'u'.repeat(33)}   | ${username_size}
		${'email'}    | ${null}             | ${email_null}
		${'email'}    | ${'mail.com'}       | ${email_invalid}
		${'email'}    | ${'user1.mail.com'} | ${email_invalid}
		${'email'}    | ${'user1@mail'}     | ${email_invalid}
		${'password'} | ${null}             | ${password_null}
		${'password'} | ${'P4sswor'}        | ${password_size}
		${'password'} | ${'p'.repeat(17)}   | ${password_size}
		${'password'} | ${'alllowercase'}   | ${password_pattern}
		${'password'} | ${'ALLUPPERCASE'}   | ${password_pattern}
		${'password'} | ${'123456789'}      | ${password_pattern}
		${'password'} | ${'lowerUPPER'}     | ${password_pattern}
		${'password'} | ${'lower4nd5678'}   | ${password_pattern}
		${'password'} | ${'UPPER1234567'}   | ${password_pattern}
	`('returns $expectedMessage when $field is $value when selected language is BG', async ({ field, value, expectedMessage }) => {
		const user = {
			username: 'user1',
			email: 'user1@email.com',
			password: 'P4ssword',
		};

		user[field] = value;
		const response = await postUser(user, { language: 'bg' });
		const body = response.body;
		expect(body.validationErrors[field]).toBe(expectedMessage);
	});

	it(`returns ${email_inuse} message when email is already in use when selected language is set to BG`, async () => {
		await User.create({ ...validUser });
		const response = await postUser(validUser, { language: 'bg' });
		expect(response.body.validationErrors.email).toBe(email_inuse);
	});

	it(`return ${user_created} when signup request is valid`, async () => {
		const response = await postUser(validUser, { language: 'bg' });
		expect(response.body.message).toBe(user_created);
	});

	it(`returns ${email_failure} message when sending activation email fails and the language is set to BG`, async () => {
		const mockedSendAccountActivationEmail = jest
			.spyOn(EmailService, 'sendAccountActivationEmail')
			.mockRejectedValue({ message: 'Failed to deliver email' });
		const response = await postUser({ ...validUser }, { language: 'bg' });
		console.log(response.body.message);
		mockedSendAccountActivationEmail.mockRestore();
		expect(response.body.message).toBe(email_failure);
	});
});
