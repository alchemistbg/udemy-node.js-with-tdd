const express = require('express');

const UserService = require('./UserService');

const router = express.Router();

router.post('/', async (req, res) => {
	await UserService.save(req.body);

	return res.status(200).send({ message: 'User created' });
});

module.exports = router;
