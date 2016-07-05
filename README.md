# server
This server will be a nodejs application using expressjs library. It will have a REST API to receive http requests from users clients (app or webpage) in order to use their functionalities. It will store data in MongoDB.

<h3>technology stack:</h3>

* ubuntu 14.04
* Nodejs
  * expressjs
  * momentjs
  * mongodb native driver 
  * facebook api
*  MongoDB

*more technology could be added if this project increases its user base scale.*

<br>
<h3>REST API functionalities</h3>

Check if email has already been used by any user.

    method: GET
    path: /checkemailexistence/<email>
    successful return: {msg: "email exists", success: true}
    unsuccessful return: {msg: "email does not exists", success: false}

Create an account with email, password and display name.

    method: POST
    path: createaccountemail/<email>/<password>/<displayname>
    successful return: {msg: "account deleted", success: true}
    unsuccessful return: {msg: "email already exists", success: false, email: email}

Delete an account with email and password.

    method: POST
    path: deleteccountemail/<email>/<password>
    successful return: {msg: "account created", success: true}
    unsuccessful return: {msg: "email and password do not match", success: false}

Log user in

    method: GET
    path: /loginemail/<email>/<password>/<source>
    successful return: {msg: "login successful", success: true, user: user, token: token}
    unsuccessful return: {msg: "bad login info", success: false}


Log user in

    method: POST
    path: /logout/<token>
    successful return: {msg: "logout successful", success: true}
    unsuccessful return: {msg: "already out", success: false}


Change display name

    method: POST
    path: /changename/<token>/<displayname>
    successful return: {msg: "changed display name", success: true}
    unsuccessful return: {msg: "bad display name", success: false}

Search a user using email

    method: GET
    path: /search/<email>
    successful return: {msg: "found user", success: true, user: user}
    unsuccessful return: {msg: "no user found", success: false}

Request friendship to a user

    method: POST
    path: /requestfriendship/<token>/<friendId>
    successful return: {msg: "friendship requested", success: true}
    unsuccessful return: {msg: "friend doesn't exist", success: false}

Get all pending requests

    method: GET
    path: /pendingrequests/<token>
    return: {msg: "all pending requests", success: true, requests: requests}

Accept friend request

    method: POST
    path: /acceptfriend/<token>/<requestId>
    successful return: {msg: "accepted friend", success: true, friend: friend}
    unsuccessful return: {msg: "could not accept friend request", success: false}

 List Friends and their current towns

    method: GET
    path: /listfriends/<token>
    return: {msg: "friend's list", success: true, friends: friends}

Update current position, town and country

    method: POST
    path: /location/<token>/<lat>/<long>/<town>/<country>
    successful return: {msg: "updated location", success: true}
    unsuccessful return: {msg: "could not update location", success: false}

Get current position, town, country, name, visibility.

    method: POST
    path: /location/<token>
    successful return: {msg: "found you!", success: true, user: user}
    unsuccessful return: {msg: "could not find you", success: false}


* Add selected friends from facebook
* Set current town update frequency
* Get current town update frequency

*more functionalities could be added later.*

<br>
<h3>To make it work</h3>

* <code>cd path/to/project</code>
* issue <code>npm install</code>
* issue <code>node index.js</code>
