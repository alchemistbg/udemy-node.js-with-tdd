const nodemailer = require('nodemailer');
const transporter = require('../config/emailTransporter');

const sendAccountActivationEmail = async (email, activationToken) => {
	const info = await transporter.sendMail({
		from: 'My Cool API <info@coolapi.com>',
		to: email,
		subject: 'Activation email',
		html: `
				<h2>Account Activation</h2>

				<div>
					<b>Please click the link below in order to activate your account!</b>
				</div>
				
				<div>
					<a href="http://localhost:8080/#/login?token=${activationToken}">Activate</a>
				</div>	
		`,
	});
	if (process.env.NODE_ENV === 'development') {
		console.log(`URL: ${nodemailer.getTestMessageUrl(info)}`);
	}
};

module.exports = { sendAccountActivationEmail };
