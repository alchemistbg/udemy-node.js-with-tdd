const express = require('express');

const User = require('./user/User');

const app = express();

app.use(express.json());

// app.get('/', (req, res) => {
// 	res.status(200).send({
// 		message: 'OK',
// 	});
// });

app.post('/api/1.0/users', (req, res) => {
	console.log(req.body);
	User.create(req.body).then(() => {
		res.status(200).send({
			message: 'User created',
		});
	});
});

module.exports = app;
