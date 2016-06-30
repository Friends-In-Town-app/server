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

* Create an account with email, password and display name.
* Change display name
* Add friend
* Add selected friends from facebook
* List Friends and their current towns
* Update current town
* Set current town update frequency
* Get current town update frequency
* Get last town update time.

*more functionalities could be added later.*

<br>
<h3>To make it work</h3>

* <code>cd path/to/project</code>
* issue <code>npm install</code>
* issue <code>node index.js</code>
