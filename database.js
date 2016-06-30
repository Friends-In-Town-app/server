var MongoClient = require('mongodb').MongoClient // mongodb driver for nodejs. installed using npm.
var ObjectId = require('mongodb').ObjectId
var assert = require('assert'); // assert module from nodejs default api. will be used inside mongodb callbacks.


var Mongodb = function () {
	this.a = 'lala'
	this.db
	this.users
	this.usersEmailCredentials
	this.usersFacebookCredentials
	this.friendShip
	this.usersRequests
	this.usersSessions
};

Mongodb.prototype.connect = function (domainAndPort, databaseName, callback) {
	var self = this
	MongoClient.connect('mongodb://'+domainAndPort+'/' + databaseName, function (err, database) {
		assert.equal(null, err);
		self.db = database // we will use the database object later.
		self.users = self.db.collection("users")
		self.usersEmailCredentials = self.db.collection("emailCredential")
		self.usersFacebookCredentials = self.db.collection("facebookCredential")
		self.friendShip = self.db.collection("friendShip")
		self.usersRequests = self.db.collection("usersRequests")
		self.usersSessions = self.db.collection("usersSessions")
		callback()
	})
}


Mongodb.prototype.existsEmail = function (email, callback) {
	var self = this
	self.usersEmailCredentials.find({email: email}, {_id: 0, email: email}).limit(1).toArray(function (err, docs) {
		if (docs.length === 1) callback(true)
		else callback(false)
	})
}

Mongodb.prototype.createAccountWithEmail = function (email, password, displayName, callback) {
	var self = this
	self.existsEmail(email, function (exists) {
		if (exists) {
			callback()
		} else {
			var user = {ct: undefined, city: undefined, pos: undefined, vis: true, n: displayName}
			self.users.insertOne(user, function (err, result) {
				var newUserId = result.ops[0]._id
				var userCredentials = {_id: newUserId, email: email, pw: password}
				self.usersEmailCredentials.insertOne(userCredentials, function (err, result) {
					if (err)
						callback()
					else
						callback(newUserId)
				})
			})
		}
	})
};

Mongodb.prototype.existsUserId = function (id, callback) {
	var self = this
	self.users.find({_id: ObjectId(id)}, {_id: 1}).limit(1).toArray(function (err, docs) {
		if (docs.length === 1) callback(docs[0]._id)
		else callback()
	})
}

Mongodb.prototype.tryLogin = function (email, password, callback) {
	var self = this
	self.usersEmailCredentials.find({email: email, pw: password}, {_id: 1}).limit(1).toArray(function (err, docs) {
		if (docs.length === 1) callback(docs[0]._id)
		else callback()
	})
};

Mongodb.prototype.setSessionForId = function (id, source, callback) {
	var self = this
	self.usersSessions.findOne({uid: id, s: source}, {_id: 1}, function (err, doc) {
		if (doc) {
			self.usersSessions.remove({_id: doc._id}, function (err, result) {
				self.createSessionForId(id, source, callback)
			})
		} else {
			self.createSessionForId(id, source, callback)
		}
	})
};

Mongodb.prototype.createSessionForId = function (id, source, callback) {
	var self = this
	self.usersSessions.insertOne({uid: id, s: source, d: new Date()}, function (err, result) {
		callback(result.ops[0]._id) // token is MongoDB ObjectID from sessions collection.
	})
};

Mongodb.prototype.getUserIdByToken = function (token, callback) {
	var self = this
	self.usersSessions.find({_id: ObjectId(token)}, {uid: 1}).limit(1).toArray(function (err, docs) {
		if (docs.length === 1)
			callback(docs[0].uid)
		else {
			callback()
		}
	})
};


Mongodb.prototype.deleteSessionForToken = function (token, callback) {
	var self = this
	self.usersSessions.remove({uid: ObjectId(token)}, function (err, r) {
		if (r.result.n > 0) callback(true)
		else callback(false)
	})
};

Mongodb.prototype.getUserById = function (id, callback) {
	var self = this
	self.users.find({_id: id}).limit(1).toArray(function (err, docs) {
		if (docs.length === 1) callback(docs[0])
		else callback()
	})
};

Mongodb.prototype.getUserDisplayById = function (id, callback) {
	var self = this
	self.users.findOne({_id: id}, {_id: 1, n: 1, pos: 1, city: 1, ct: 1}, function (err, doc) {
		callback(doc)
	})
};

Mongodb.prototype.getUserDisplayByEmail = function (email, callback) {
	var self = this
	self.usersEmailCredentials.find({email: email}, {_id: 1}).limit(1).toArray(function (err, docs) {
		if (docs.length === 1) {
			self.users.find({_id: docs[0]._id}, {_id: 1, n: 1, pos: 1, city: 1, ct: 1})
			.limit(1).toArray(function (err, docs) {
				if (docs.length === 1) callback(docs[0])
				else callback()
			})
		} else {
			callback()
		}
	})
};

Mongodb.prototype.changeDisplayName = function (id, displayName, callback) {
	var self = this
	self.users.updateOne({_id: id}, {$set: {n: displayName}}, function (err, result) {
		if (err) callback(false)
		else callback (true)
	})
};

Mongodb.prototype.requestFriendship = function (id, friendId, callback) {
	var self = this
	self.users.find({_id: friendId}, {_id: 1}).toArray(function (err, docs) {
		if (docs.length === 1) {
			friendIsRequestedByUser = {f: friendId, t: id, type: 'friendship', hide: false, d: new Date()}
			self.usersRequests.insert(friendIsRequestedByUser, function (err, result) {
				if (err) callback(false)
				else callback(true)
			})
		} else {
			callback(false)
		}
	})
	
};

Mongodb.prototype.getUserRequests = function (id, callback) {
	var self = this
	self.usersRequests.find({f: id}).toArray(function (err, docs) {
		var totalOfDocs = docs.length
		if (totalOfDocs > 0) {
			var requests = []
			docs.forEach(function (doc) {
				self.getUserDisplayById(doc.t, function (user) {
					if (user !== undefined) {
						doc.user = user
						requests.push(doc)
					}
					if (--totalOfDocs === 0)
						callback(requests)
				})
			})
		} else {
			callback([])
		}
	})
};

Mongodb.prototype.resolveRequest = function (requestId, solution, callback) {
	var self = this
	self.usersRequests.findOne({_id: ObjectId(requestId)}, function (err, request) {
		console.log(request)
		if (request) {
			self.usersRequests.remove({_id: request._id}, function (err, r) {
				if (r.result.n > 0) {	
					if (request.type === 'friendship') {
						if (solution === true) {
							self.addFriendById(request.f, request.t, function (friend) {
								if (friend) callback(friend)
								else callback()
							})
						} else {
							callback(false)
						}
					}
				}
			})
		} else {
			callback()
		}
	})
};

Mongodb.prototype.addFriendById = function (id, friendId, callback) {
	var self = this
	var userFriendsWithFriend = {_id: {f: id, t: friendId}, d: new Date()}
	var friendFriendsWithUser = {_id: {f: friendId, t: id}, d: new Date()}
	self.friendShip.insertMany([userFriendsWithFriend, friendFriendsWithUser], function (err, result) {
		self.getUserDisplayById(friendId, callback)
	})
};


Mongodb.prototype.getFriendsDisplay = function (id, callback) {
	var self = this
	self.friendShip.find({"_id.f": id}).toArray(function (err, docs) {
		if (docs.length > 0) {
			var asyncCounter = docs.length
			var friends = []
			docs.forEach(function (obj) {
				self.getUserDisplayById(obj._id.t, function (user) {
					if (user !== undefined) {
						obj.user = user
						friends.push(obj)
					}
					if (--asyncCounter === 0)
						callback(friends)
				})
			})
		} else {
			callback([])
		}
	})
};


Mongodb.prototype.setFullLocation = function (id, position, city, country, callback) {
	var self = this
	self.users.updateOne({_id: id}, {$set: {pos: position, city: city, ct: country}}, function (err, result) {
		if (err) callback(false)
		else callback (true)
	})
};

module.exports = Mongodb