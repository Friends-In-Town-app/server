var MongoClient = require('mongodb').MongoClient // mongodb driver for nodejs. installed using npm.
var ObjectId = require('mongodb').ObjectId
var assert = require('assert'); // assert module from nodejs default api. will be used inside mongodb callbacks.


var Mongodb = function () {
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
		if (docs.length === 1) callback("email already exists", true)
		else callback("email does not exists", false)
	})
}

Mongodb.prototype.createAccountWithEmail = function (email, password, displayName, callback) {
	var self = this
	self.existsEmail(email, function (msg, success) {
		if (success) callback(msg, false)
		else {
			var user = {add: undefined, pos: undefined, vis: true, n: displayName}
			self.users.insertOne(user, function (err, result) {
				var newUserId = result.ops[0]._id
				var userCredentials = {_id: newUserId, email: email, pw: password}
				self.usersEmailCredentials.insertOne(userCredentials, function (err, result) {
					if (result.ops[0]) callback("account created", true)
				})
			})
		}
	})
};

Mongodb.prototype.deleteAccount = function (id, password, callback) {
	var self = this
	self.usersEmailCredentials.find({_id: id}, {pw: 1}).limit(1).toArray(function (err, docs) {
		if (docs.length === 1) {
			if (docs[0].pw === password) {
				var asyncCounter = 5
				var waitAllAsyncCalls = function (err, r) { if (--asyncCounter === 0) callback("account deleted", true) }
				self.friendShip.bulkWrite([{deleteMany: {filter: {"_id.f": id}}}, 
				                           {deleteMany: {filter: {"_id.t": id}}}], 
				                          {ordered: false}, waitAllAsyncCalls)
				self.usersRequests.bulkWrite([{deleteMany: {filter: {f: id}}}, 
				                              {deleteMany: {filter: {t: id}}}], 
				                             {ordered: false}, waitAllAsyncCalls)
				self.usersSessions.deleteMany({uid: id}, waitAllAsyncCalls)
				self.usersEmailCredentials.deleteMany({_id: id}, waitAllAsyncCalls)
				self.users.deleteMany({_id: id}, waitAllAsyncCalls)
			} else {
				callback("password do not match", false)
			}
		} else {
			callback("session exists but id does not exist for any user", false)
		}
	})
};

Mongodb.prototype.existsUserId = function (id, callback) {
	var self = this
	self.users.find({_id: ObjectId(id)}, {_id: 1}).limit(1).toArray(function (err, docs) {
		if (docs.length === 1) callback('found them', true)
		else callback('user does not exist', false)
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
		if (docs.length === 1) callback(docs[0].uid)
		else callback()
	})
};


Mongodb.prototype.deleteSessionForToken = function (token, callback) {
	var self = this
	self.usersSessions.remove({_id: ObjectId(token)}, function (err, r) {
		console.log()
		if (r.result.n > 0) callback("logout successful", true)
		else callback("already out", false)
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
	self.users.findOne({_id: id}, {_id: 1, n: 1, pos: 1, add: 1}, function (err, doc) {
		callback(doc)
	})
};

Mongodb.prototype.getUserDisplayByEmail = function (email, callback) {
	var self = this
	self.usersEmailCredentials.findOne({email: email}, {_id: 1}, function (err, doc) {
		if (doc) {
			self.users.findOne({_id: doc._id}, {_id: 1, n: 1, add: 1}, function (err, doc) {
				if (doc) {
					doc.email = email
					callback("found user", true, doc)
				}
				else callback("users has an account with us but we could not find their information", false)
			})
		} else {
			callback("no user found", false)
		}
	})
};

Mongodb.prototype.changeDisplayName = function (id, displayName, callback) {
	var self = this
	self.users.updateOne({_id: id}, {$set: {n: displayName}}, function (err, result) {
		if (err) callback("something bad happened, try again", false)
		else callback ("changed display name", true)
	})
};

Mongodb.prototype.requestFriendship = function (id, friendId, callback) {
	var self = this
	friendId = ObjectId(friendId)
	var errMsg = "for some reason we couldn't request friendship"
	self.friendShip.findOne({"_id.f": id, "_id.t": friendId}, function (err, friendship) {
		if (err) callback(errMsg, false)
		else {
			if (friendship) callback('You are both already friends', false) // they are already friends.
			else {
				var friendIsRequestedByUser = {f: friendId, t: id, type: 'friendship', hide: false, d: new Date()}
				var query = {f: friendIsRequestedByUser.f, t: friendIsRequestedByUser.t, type: friendIsRequestedByUser.type}
				self.usersRequests.update(query, friendIsRequestedByUser, {upsert: true}, function (err, result) {
					if (err) callback(errMsg, false)
					else callback("friendship requested", true)
				})
			}
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

Mongodb.prototype.resolveRequest = function (id, requestId, solution, callback) {
	var self = this
	var errMsg = "could not accept friend request"
	self.usersRequests.findOne({_id: ObjectId(requestId)}, function (err, request) {
		if (request) {
			if ( request.f.equals(id) ) {
				self.usersRequests.remove({f: request.t, t: request.f}, function (err, r) {
					// also removing inversed request in cases both sides requests each other.
				})
				self.usersRequests.remove({_id: request._id}, function (err, r) {
					if (r.result.n > 0) {
						if (request.type === 'friendship') {
							if (solution === true) {
								self.addFriendById(request.f, request.t, function (friend) {
									if (friend) callback("accepted friend", true, friend)
									else callback("could not accept friend request", false)
								})
							} else {
								callback('change information message later', false)
							}
						}
					}
				})
			} else {
				callback(errMsg, false)
			}
		} else {
			callback(errMsg, false)
		}
	})
};

Mongodb.prototype.addFriendById = function (id, friendId, callback) {
	var self = this
	var userFriendsWithFriend = {_id: {f: id, t: friendId}, d: new Date()}
	var friendFriendsWithUser = {_id: {f: friendId, t: id}, d: new Date()}
	self.friendShip.insertMany([userFriendsWithFriend, friendFriendsWithUser], function (err, result) {
		if (err) callback()
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


Mongodb.prototype.setFullLocation = function (id, position, address, callback) {
	var self = this
	self.users.updateOne({_id: id}, {$set: {pos: position, add: address}}, function (err, result) {
		if (err) callback("could not update location", false)
		else callback ("updated location", true)
	})
};

module.exports = Mongodb