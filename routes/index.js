var Constant = require('../constant')

var BaseRouter = require('./base.router')

var path = require('path');


class IndexRouter extends BaseRouter{

	additionalController(){
		this.router.get('/', function(req, res, next) {
		
			res.sendFile(path.join(Constant.rootFolder, 'public/index.html'), function(err) {
				if (err) {
					res.status(500).send(err)
				}
			})
		});
	}
}

module.exports = IndexRouter;
