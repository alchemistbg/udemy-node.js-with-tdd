const express = require('express');
const { check, validationResult } = require('express-validator');

const UserService = require('./UserService');
const ValidationException = require('../error/ValidationException');

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

router.get('/', async (req, res) => {
	let page = req.query.page ? +req.query.page : 0;
	if (page < 0) {
		page = 0;
	}
	const users = await UserService.getUsers(page);
	res.status(200).send(users);
});

module.exports = router;
