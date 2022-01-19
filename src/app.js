const express = require('express');

const UserRouter = require('./user/UserRouter');

const app = express();

app.use(express.json());

app.use('/api/1.0/users', UserRouter);

module.exports = app;
