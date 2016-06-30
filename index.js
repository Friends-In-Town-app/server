
var db = new (require(__dirname+"/database.js"))()
var fs = require('fs')
var express = require('express');
var app = express();

app.use(express.static('web'));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', function(req, res, next) {
	console.log(' - a ' + req.method + ' request has arrived:', req.originalUrl);
});

app.post('/', function(req, res, next) {
	console.log(' - a ' + req.method + ' request has arrived:', req.originalUrl);
});

app.get('/checkemailexistence/:email', function (req, res) {
	db.existsEmail(req.params.email, function (id) {
		if (id) res.json({msg: "email exists", success: true})
		else res.json({msg: "email does not exists", success: false})
	})
});

app.post('/createaccountemail/:email/:password/:displayname', function (req, res) {
	db.createAccountWithEmail(req.params.email, req.params.password, req.params.displayname, function (id) {
		if (id !== undefined) res.jsonp({msg: "account created", success: true})
		else res.jsonp({msg: "email already exists", success: false, email: req.params.email})
	})
});
	
app.get('/loginemail/:email/:password/:source', function (req, res) {
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
	db.deleteSessionForToken(req.params.token, function (ok) {
		if (ok) res.jsonp({msg: "logout successful", success: true})
		else res.jsonp({msg: "already out", success: false})
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

app.post('/changename/:token/:displayname', function (req, res) {
	if (req.params.displayname.length > 0) {
		getUserIdByToken(res, req.params.token, function (id) {
			db.changeDisplayName(id, req.params.displayname, function (ok) {
				if (ok) res.jsonp({msg: "changed display name", success: true})	
				else res.jsonp({msg: "something bad happened, try again.", success: false})	
			})
		})
	} else {
		res.jsonp({msg: "bad display name", success: false})
	}
	
});

app.get('/search/:email', function (req, res) {
	db.getUserDisplayByEmail(req.params.email, function (user) {
		if (user !== undefined) res.jsonp({msg: "found user", success: true, user: user})
		else res.jsonp({msg: "no user found", success: false})
	})
});

app.post('/requestfriendship/:token/:friendid', function (req, res) {
	getUserIdByToken(res, req.params.token, function (id) {
		db.existsUserId(req.params.friendid, function (ok) {
			if (ok) {
				db.requestFriendship(id, req.paramsfriendId, function (ok) {
					if (ok) res.jsonp({msg: "friendship requested", success: true})
					else res.jsonp({msg: "for some reason we couldn't request friendship", success: false})
				})
			} else {
				res.jsonp({msg: "friend doesn't exist", success: false})
			}
		})
	})
});

app.get('/pendingrequests/:token', function (req, res) {
	getUserIdByToken(res, req.params.token, function (id) {
		db.getUserRequests(id, function(requests) {
			res.jsonp({msg: "all pending requests", success: true, requests: requests})
		})
	})
});

app.post('/acceptfriend/:token/:requestId', function (req, res) {
	getUserIdByToken(res, req.params.token, function (id) {
		db.resolveRequest(req.params.requestId, true, function (friend) {
			if (friend !== undefined) res.jsonp({msg: "accepted friend", success: true, friend: friend})
			else res.jsonp({msg: "could not accept friend request", success: false})
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

app.post('/location/:token/:lat/:long/:town/:country', function (req, res) {
	getUserIdByToken(res, req.params.token, function (id) {
		var town = req.params.town.replace(/%20/g,  ' ')
		var country = req.params.country.replace(/%20/g,  ' ')
		db.setFullLocation(id, [req.params.lat, req.params.long], town, country, function (ok) {
			if (ok) res.jsonp({msg: "updated location", success: true})
			else res.jsonp({msg: "could not update location", success: false})
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
	console.log('-- Example app listening on port '+port+'!');
});