const express = require('express');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');

const router = express.Router();
const UserService = require('../user/UserService');
const AuthException = require('./AuthException');
const ForbiddenException = require('../error/ForbiddenException');

router.post('/', check('email').isEmail(), async (req, res, next) => {
	const { email, password } = req.body;
	const error = validationResult(req);

	if (!error.isEmpty()) {
		return next(new AuthException());
	}

	const user = await UserService.findUserByEmail(email);
	if (!user) {
		return next(new AuthException());
	}

	const match = await bcrypt.compare(password, user.password);
	if (!match) {
		return next(new AuthException());
	}

	if (user.inactive) {
		return next(new ForbiddenException());
	}

	res.status(200).send({
		id: user.id,
		username: user.username,
	});
});

module.exports = router;
