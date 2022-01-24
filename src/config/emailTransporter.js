const nodemailer = require('nodemailer');
// The following two lines are not necessary because of installing of smtp-server
// const nodemailerStub = require('nodemailer-stub');
// const transporter = nodemailer.createTransport(nodemailerStub.stubTransport);
const config = require('config');

const mailConfig = config.get('mail');

const transporter = nodemailer.createTransport({ ...mailConfig });

module.exports = transporter;
