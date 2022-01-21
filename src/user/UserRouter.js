const express = require('express');
const { check, validationResult } = require('express-validator');

const UserService = require('./UserService');
const router = express.Router();

router.post(
	'/',
	check('username')
		.notEmpty()
		.withMessage('Username cannot be null!')
		.bail()
		.isLength({ min: 4, max: 32 })
		.withMessage('Must have min 4 and max 32 characters!'),
	check('email')
		.notEmpty()
		.withMessage('Email cannot be null!')
		.bail()
		.isEmail()
		.withMessage('Email must be a valid email!')
		.bail()
		.custom(async (email) => {
			const user = await UserService.findByEmail(email);
			if (user) {
				throw new Error('Email already in use!');
			}
		}),
	check('password')
		.notEmpty()
		.withMessage('Password cannot be null!')
		.bail()
		.isLength({ min: 8, max: 16 })
		.withMessage('Must have min 8 and max 16 characters!')
		.bail()
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).*$/)
		.withMessage('Password must have at least 1 uppercase, 1 lowercase letter as well as 1 number!'),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const validationErrors = {};
			errors.array().forEach((error) => {
				return (validationErrors[error.param] = error.msg);
			});
			return res.status(400).send({ validationErrors: validationErrors });
		}
		await UserService.save(req.body);
		return res.status(200).send({ message: 'User created' });
	}
);

module.exports = router;
