const app = require('./src/app');
const sequelize = require('./src/config/database');

sequelize.sync({ force: true });

app.listen(3000, () => {
	console.log('Server is up and running on port 3000');
});
