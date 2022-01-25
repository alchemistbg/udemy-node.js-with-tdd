function InvalidTokenException() {
	this.status = 400;
	this.message = 'account_activation_failure';
}

module.exports = InvalidTokenException;
