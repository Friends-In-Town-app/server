
var db = new (require(__dirname+"/database.js"))()
var fs = require('fs')
var express = require('express');
var app = express();

app.use(express.static('web'));

app.use(function(req, res, next) {
	console.log((new Date()).toLocaleString() + ' - a ' + req.method + ' request has arrived:', req.originalUrl, 'from ip: '+req.ip );
	// res.header("Access-Control-Allow-Origin", "*");
	// res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', "*");
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Credentials', true);
  next();
};
app.use(allowCrossDomain);

app.get('/checkemailexistence/:email', function (req, res) {
	db.existsEmail(req.params.email, function (msg, success) {
		res.json({msg: msg, success: success})
	})
});

app.post('/createaccountemail/:email/:password/:displayname', function (req, res) {
	db.createAccountWithEmail(req.params.email, req.params.password, req.params.displayname, function (msg, success) {
		res.jsonp({msg: msg, success: success})
	})
});
	
app.post('/loginemail/:email/:password/:source', function (req, res) {
	db.tryLogin(req.params.email, req.params.password, function (id) {
		if (id !== undefined) {
			db.setSessionForId(id, req.params.source, function (token) {
				db.getUserById(id, function (user) {
					if (user !== undefined) res.jsonp({msg: "login successful", success: true, user: user, token: token})
					else res.jsonp({msg: "user credentials exist but user data doesn't exist", success: false})
				})
			})
		} else {
			res.jsonp({msg: "bad login info", success: false})
		}
	})
});

app.post('/logout/:token', function (req, res) {
	db.deleteSessionForToken(req.params.token, function (msg, success) {
		res.jsonp({msg: msg, success: success})
	})
});

var getUserIdByToken = function (res, token, callback) {
	if (token.length === 24 && /^[0-9a-fA-F]{24}$/.test(token)) {
		db.getUserIdByToken(token, function (id) {
			if (id !== undefined) {
				callback(id)
			} else {
				res.jsonp({msg: "token does not exist", success: false, token: token})	
			}
		})
	} else {
		res.jsonp({msg: "token does not have 24 hexadecimal characters", success: false, token: token})	
	}
}


app.post('/deleteaccount/:token/:password', function (req, res) {
	getUserIdByToken(res, req.params.token, function (id) {
		db.deleteAccount(id, req.params.password, function (msg, success) {
			res.jsonp({msg: msg, success: success})
		})
	})
});

app.post('/changename/:token/:displayname', function (req, res) {
	if (req.params.displayname.length > 0) {
		getUserIdByToken(res, req.params.token, function (id) {
			db.changeDisplayName(id, req.params.displayname, function (msg, success) {
				res.jsonp({msg: msg, success: success})	
			})
		})
	} else {
		res.jsonp({msg: "bad display name", success: false})
	}
	
});

app.get('/search/:email', function (req, res) {
	db.getUserDisplayByEmail(req.params.email, function (msg, success, user) {
		res.jsonp({msg: msg, success: success, user: user})
	})
});

app.post('/requestfriendship/:token/:friendid', function (req, res) {
	getUserIdByToken(res, req.params.token, function (id) {
		db.existsUserId(req.params.friendid, function (msg, success) {
			if (success) {
				db.requestFriendship(id, req.params.friendid, function (msg, success) {
					res.jsonp({msg: msg, success: success})
				})
			} else {
				res.jsonp({msg: msg, success: success})
			}
		})
	})
});

app.get('/pendingrequests/:token', function (req, res) {
	getUserIdByToken(res, req.params.token, function (id) {
		db.getUserRequests(id, function (requests) {
			res.jsonp({msg: "all pending requests", success: true, requests: requests})
		})
	})
});

app.post('/acceptfriend/:token/:requestId', function (req, res) {
	getUserIdByToken(res, req.params.token, function (id) {
		db.resolveRequest(id, req.params.requestId, true, function (msg, success, friend) {
			res.jsonp({msg: msg, success: success, friend: friend})
		})
	})
});

app.get('/listfriends/:token', function (req, res) {
	getUserIdByToken(res, req.params.token, function (id) {
		db.getFriendsDisplay(id, function (friends) {
			res.jsonp({msg: "friend's list", success: true, friends: friends})
		})
	})
});

app.post('/location/:token/:lat/:long/:address/', function (req, res) {
	getUserIdByToken(res, req.params.token, function (id) {
		var address = req.params.address.replace(/%20/g,  ' ')
		db.setFullLocation(id, [req.params.lat, req.params.long], address, function (msg, success) {
			res.jsonp({msg: msg, success: success})
		})
	})
});

app.get('/location/:token', function (req, res) {
	getUserIdByToken(res, req.params.token, function (id) {
		db.getUserById(id, function (user) {
			if (user !== undefined) res.jsonp({msg: "found you!", success: true, user: user})
			else res.jsonp({msg: "could not find you", success: false})
		})
	})
});


var configs = JSON.parse(fs.readFileSync(__dirname+"/configs.json"))
var domainAndPort = configs.database.domainAndPort
var databaseName = configs.database.databaseName
db.connect(domainAndPort, databaseName, function () {
	console.log("-- Connected correctly to mongodb at "+domainAndPort+" to database "+databaseName+".");
})
var port = configs.server.port
app.listen(port, function () {
	console.log((new Date()).toLocaleString() + ' -- Example app listening on port '+port+'!');
});