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
		restartIdentity: true
	});
});

describe('Test user registration functionality', () => {
	// it('return 200 when signup request is valid', (done) => {
	// 	supertest(app)
	// 		.post('/api/1.0/users')
	// 		.send({
	// 			username: 'user1',
	// 			email: 'user1@mail.com',
	// 			password: 'P4ssword',
	// 		})
	// 		.expect(200, done);
	// });

	//This is another variant of this test that uses then clause
	it('return 200 when signup request is valid', (done) => {
		supertest(app)
			.post('/api/1.0/users')
			.send({
				username: 'user1',
				email: 'user1@mail.com',
				password: 'P4ssword',
			})
			.then((response) => {
				expect(response.status).toBe(200);
				done();
			});
	});

	// This is another variant of this test that uses async/await.
	// There is fake parsing error from eslint: doesn't like the fat arrow =>
	// it('/posts', async () => {
		// 	const response = await supertest(app)
		// 	.post('/api/1.0/users')
		// 	.send({
			// 		username: 'user1',
			// 		email: 'user1@mail.com',
			// 		password: 'P4ssword',
			// 	});
			// 	expect(response.status).toBe(200);
	// });

	it('return success message when signup request is valid', (done) => {
		supertest(app)
			.post('/api/1.0/users')
			.send({
				username: 'user1',
				email: 'user1@mail.com',
				password: 'P4ssword',
			})
			.then((response) => {
				expect(response.body.message).toBe('User created');
				done();
			});
	});

	it('saves user to the database', (done) => {
		supertest(app)
			.post('/api/1.0/users')
			.send({
				username: 'user1',
				email: 'user1@mail.com',
				password: 'P4ssword',
			})
			.then(() => {
				// Query the users table
				User.findAll().then((userList) => {
					expect(userList.length).toBe(1);
					done();
				});
			});
	});

	it('saves username and email to the database', (done) => {
		supertest(app)
			.post('/api/1.0/users')
			.send({
				username: 'user1',
				email: 'user1@mail.com',
				password: 'P4ssword',
			})
			.then(() => {
				// Query the users table
				User.findAll().then((userList) => {
					const savedUser = userList[0];
					expect(savedUser.username).toBe('user1');
					expect(savedUser.email).toBe('user1@mail.com');
					done();
				});
			});
	});

	it('hashes password when saving user to the database', (done) => {
		supertest(app)
			.post('/api/1.0/users')
			.send({
				username: 'user1',
				email: 'user1@mail.com',
				password: 'P4ssword',
			})
			.then(() => {
				// Query the users table
				User.findAll().then((userList) => {
					const savedUser = userList[0];
					expect(savedUser.password).not.toBe('P4ssword');
					done();
				});
			});
	});
});
