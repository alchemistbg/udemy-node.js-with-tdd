function EmailException() {
	this.status = 502;
	this.message = 'email_failure';
}

module.exports = EmailException;
