const express = require('express');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

const UserService = require('./UserService');
const pagination = require('../middleware/pagination');
const ValidationException = require('../error/ValidationException');
const ForbiddenException = require('../error/ForbiddenException');

const router = express.Router();

router.post(
	'/',
	check('username')
		.notEmpty()
		.withMessage('username_null')
		.bail()
		.isLength({ min: 4, max: 32 })
		.withMessage('username_size'),
	check('email')
		.notEmpty()
		.withMessage('email_null')
		.bail()
		.isEmail()
		.withMessage('email_invalid')
		.bail()
		.custom(async (email) => {
			const user = await UserService.findUserByEmail(email);
			if (user) {
				throw new Error('email_inuse');
			}
		}),
	check('password')
		.notEmpty()
		.withMessage('password_null')
		.bail()
		.isLength({ min: 8, max: 16 })
		.withMessage('password_size')
		.bail()
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).*$/)
		.withMessage('password_pattern'),
	async (req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(new ValidationException(errors.array()));
		}
		try {
			await UserService.saveUser(req.body);
			return res.status(200).send({ message: req.t('user_created') });
		} catch (error) {
			next(error);
		}
	}
);

// The path is also changed on the frontend. Must be done if the REST API endpoints will be different!
router.post('/activation/:token', async (req, res, next) => {
	const { token } = req.params;
	try {
		await UserService.activateUser(token);
		return res.status(200).send({ message: req.t('account_activation_success') });
	} catch (error) {
		next(error);
	}
});

router.get('/', pagination, async (req, res) => {
	const { currPage, pageSize } = req.pagination;

	const users = await UserService.getUsers(currPage, pageSize);
	res.status(200).send(users);
});

router.get('/:userId', async (req, res, next) => {
	const { userId } = req.params;
	try {
		const user = await UserService.getUser(userId);
		res.status(200).send(user);
	} catch (error) {
		next(error);
	}
});

router.put('/:userId', async (req, res, next) => {
	const { authorization } = req.headers;
	if (authorization) {
		const encodedAuthData = authorization.substring(6);
		const decodedAuthData = Buffer.from(encodedAuthData, 'base64').toString('ascii');
		const [email, password] = decodedAuthData.split(':');
		const user = await UserService.findUserByEmail(email);

		if (!user) {
			return next(new ForbiddenException('unauthorized_user_update'));
		}

		if (user.id !== +req.params.userId) {
			return next(new ForbiddenException('unauthorized_user_update'));
		}

		if (user.inactive) {
			return next(new ForbiddenException('unauthorized_user_update'));
		}

		const match = await bcrypt.compare(password, user.password);
		if (!match) {
			return next(new ForbiddenException('unauthorized_user_update'));
		}
		await UserService.updateUser(req.params.userId, req.body);
		return res.status(200).send();
	}

	return next(new ForbiddenException('unauthorized_user_update'));
});

module.exports = router;
