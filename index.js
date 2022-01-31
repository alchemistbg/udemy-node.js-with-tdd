const app = require('./src/app');
const sequelize = require('./src/config/database');

sequelize.sync({ force: true }).then(async () => {
	await populateDatabase(25);
});

app.listen(3000, () => {
	console.log('Server is up and running on port 3000');
});
