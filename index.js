var express = require('express'),
app = express();

var bodyParser = require('body-parser');

var _redirect;
var accessTokens = {};
var refreshTokens = {};
var authorizationCodes = {};
var validClientIds = ["OAuthTest", "Layer7", "ronnie", "mitra", "was", "here"]

// setup jade template engine
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded());

// Static directory
app.use('/docs', express.static('docs'));

// Simple GUID generator courtesy of http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
var guid = (function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }
  return function() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
           s4() + '-' + s4() + s4() + s4();
  };
})();

// OAuth Authorization Starting Point
app.get('/oauth2/authorize', function(req, res) {
	var responseType = req.param('response_type');
	var clientId = req.param('client_id');
	var redirectUri = req.param('redirect_uri');
	var scope = req.param('scope');
	var state = req.param('state');
	
	// Authenticate client application
	var clientIdFound = false;	
	for( var i = 0; i < validClientIds.length; i++ ) {
		if( validClientIds[i] === clientId ) {
			clientIdFound = true;
			break;
		}
	}
	
	if( !clientIdFound ) {
		if( redirectUri ) {
			var redirect = redirectUri + "?error=unauthorized_client";
			res.redirect(redirect);
		} else {
			res.send(401, "Unauthorized client");
		}
		return;		
	}
	
	// Check the flow type
	if( responseType === 'code' ) {
	}	
		
	res.render('login', {clientId: clientId, redirect: redirectUri, state: state});
});

app.post('/login', function(req, res) {
	// Validate the end user credentials
	var username = req.param('username');
	var password = req.param('password');
	var redirect = req.param('oauth2_redirect');
	var clientId = req.param('oauth2_clientId');
	var state = req.param('oauth2_state');
		
	// Present a grant screen
	res.render('grant', {clientId: clientId, redirect: redirect, state: state});
});

app.post('/grant', function(req, res) {
	var redirect = req.param('oauth2_redirect');	
	var allow = req.param('allow');
	var state = req.param('oauth2_state');
	var clientId = req.param('oauth2_clientId');
	
	if( allow === 'grant' ) {
		var code = guid();
		authorizationCodes.clientId = code;
		redirect = redirect + "?code="+code;	
		if( state ) {
			redirect = redirect + "&state="+state;	
		}		
	} else {
		redirect = redirect + "?error=access_denied";
	}	
	res.redirect(redirect);	
});

app.post('/oauth2/token', function(req, res) {
	var grantType = req.param('grant_type');
	var code = req.param('code');
	var redirectUri = req.param('redirect_uri');
	var clientId = req.param('client_id');
	
	//TODO: Implement client authorization
	
	if( grantType === 'refresh_token' ) {
		var refreshToken = req.param('refresh_token');
		console.log(refreshToken);
		if( refreshTokens[refreshToken] ) {
			var accessToken = guid();
			accessTokens[accessToken] = {client: clientId, created: '', expires: ''};
			var response = {
				access_token: accessToken,
				token_type: "bearer",				
			};
			res.send(response);			
		} else {
			res.send( 401, 'Invalid refresh token');
		}
	}else if( grantType === 'authorization_code' ) {
		if( code != authorizationCodes.clientId ) {
			res.send(401, 'Invalid authorization code');
			return;
		}

		var accessToken = guid();
		var refreshToken = guid();

		accessTokens[accessToken] = {client: clientId, created: '', expires: ''};
		refreshTokens[refreshToken] = {client: clientId, created: '', expires: ''};

		var response = {
			access_token: accessToken,
			token_type: "bearer",
			refresh_token: refreshToken,		
		};
		res.send(response);
	} else {
		res.send(400, 'Unknown grant type');
	}
		
	
	
});

// An Oauth 2 protected resource
app.get('/todos', function(req, res) {
		
	// Extract the bearer token
	var authHeader = req.get('authorization');
	if( !authHeader || authHeader.substr(0, 'Bearer'.length) != 'Bearer' ) {
		res.send(401, 'No bearer token found' );
		return;
	}	
	var bearerToken = authHeader.substr("Bearer".length, authHeader.length).trim();
	
	// Validate the bearer token and return a response
	if( accessTokens[bearerToken]) {
		res.send('succesful');
	} else {
		res.send(401, 'You are not authorized to retrieve this todo list.');
	}
});


var port = process.env.PORT || 8084;
app.listen(port);
console.log('Express server started on port %s', port);