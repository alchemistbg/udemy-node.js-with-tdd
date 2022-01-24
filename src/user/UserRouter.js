const express = require('express');
const { check, validationResult } = require('express-validator');

const UserService = require('./UserService');
const router = express.Router();

router.post(
	'/',
	check('username').notEmpty().withMessage('username_null').bail().isLength({ min: 4, max: 32 }).withMessage('username_size'),
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
	async (req, res) => {
		// console.log(req.headers['accept-language']);
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const validationErrors = {};
			errors.array().forEach((error) => {
				return (validationErrors[error.param] = req.t(error.msg));
			});
			return res.status(400).send({ validationErrors: validationErrors });
		}
		try {
			await UserService.saveUser(req.body);
			return res.status(200).send({ message: req.t('user_created') });
		} catch (error) {
			return res.status(502).send({ message: req.t(error.message) });
		}
	}
);

// The path is also changed on the frontend. Must be done if the REST API endpoints will be different!
router.post('/activation/:token', async (req, res) => {
	const { token } = req.params;
	try {
		await UserService.activateUser(token); 
	} catch (error) {
		return res.status(400).send({ message: req.t(error.message) });
	}
	res.status(200).send({ message: req.t('account_activation_success') });
});

module.exports = router;
