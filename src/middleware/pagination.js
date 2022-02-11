const pagination = (req, res, next) => {
	const pageAsNumber = +req.query.page;
	const sizeAsNumber = +req.query.size;

	let currPage = Number.isNaN(pageAsNumber) ? 0 : pageAsNumber;
	if (currPage < 0) {
		currPage = 0;
	}

	let pageSize = Number.isNaN(sizeAsNumber) ? 0 : sizeAsNumber;
	if (pageSize > 10 || pageSize < 1) {
		pageSize = 10;
	}

	req.pagination = { pageSize, currPage };
	next();
};

module.exports = pagination;
