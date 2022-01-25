// eslint-disable-next-line no-unused-vars
const ErrorHandler = (error, req, res, next) => {
	const { status, message, errors } = error;
	let validationErrors;
	if (errors) {
		validationErrors = {};
		errors.forEach((error) => {
			return (validationErrors[error.param] = req.t(error.msg));
		});
	}
	res.status(status).send({
		path: req.originalUrl,
		timestamp: new Date().getTime(),
		message: req.t(message),
		validationErrors,
	});
};

module.exports = ErrorHandler;
