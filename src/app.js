const express = require('express');
const i18next = require('i18next');
const backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

const AuthRouter = require('./auth/AuthRouter');
const UserRouter = require('./user/UserRouter');
const ErrorHandler = require('./error/ErrorHandler');

i18next
	.use(backend)
	.use(middleware.LanguageDetector)
	.init({
		fallbackLng: 'en',
		lng: 'en',
		ns: ['translation'],
		defaultNS: 'translation',
		backend: {
			loadPath: './locales/{{lng}}/{{ns}}.json',
		},
		detection: {
			lookupHeader: 'accept-language',
		},
	});

const app = express();

app.use(middleware.handle(i18next));

app.use(express.json());

app.use('/api/1.0/users', UserRouter);
app.use('/api/1.0/auth', AuthRouter);

app.use(ErrorHandler);

module.exports = app;
