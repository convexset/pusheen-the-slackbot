const express = require('express');
const bodyparser = require('body-parser');

// const util = require('util');
// const _ = require('underscore');
// const entities = require('entities');
// const axios = require('axios');
// const pug = require('pug');

module.exports = function prepare(appEnv, log) {
	const { debugLogger } = appEnv;
	const app = express();

	const allServers = [];
	function registerServer(server) {
		allServers.push(server);
	}

	const router = express.Router();

	const { helloWorldPayload } = appEnv;
	router.get('/', (req, res) => {
		res.json(helloWorldPayload);
	});

	[
		require('./slack-bot.js'),
		require('./shutdown.js'),
		require('./push-in.js'),
		require('./slash-command-demand.js'),
	].forEach(prepareRoute => prepareRoute({ router, appEnv, log, allServers }));

	app.disable('x-powered-by');
	app.use((req, res, next) => {
		res.header('X-Powered-By', 'Love');
		next();
	});
	app.use(log.middleware);
	app.use(bodyparser.urlencoded({ extended: true }));
	app.use(bodyparser.json());
	app.use('/static', express.static('static'));

	app.use('/', router);

	return { app, registerServer };
};


// // router.post('/typeset', (req, res) => {
// // 	if (!isValidToken(req.body.token)) {
// // 		log.warn('Invalid token:', req.body.token);
// // 		res.status(401).send();
// // 		return;
// // 	}

// // 	const requestString = cleanRequestString(entities.decode(req.body.text));
// // 	log.info('Request (POST /typeset):', requestString);
// // 	res.json({ 'text': 'http://validatis.com:12345/static/c39f611683ccb8457e67ba9401cba890419ad940261bbef007503d0d3b92181b.png' });
// // 	res.end();
// // });

// // router.post('/slashtypeset', (req, res) => {
// // 	const requestString = cleanRequestString(entities.decode(req.body.text));
// // 	log.info('Request (POST /slashtypeset):', requestString);
// // 	var typesetPromise = typeset.typeset(requestString, '');
// // 	if (typesetPromise === null) {
// // 		res.send('no text found to typeset');
// // 		res.end(); // Empty 200 response -- no text was found to typeset.
// // 		return;
// // 	}
// // 	var promiseSuccess = function(mathObjects) {
// // 		var locals = {
// // 			'mathObjects': mathObjects,
// // 			'serverAddress': SERVER != '127.0.0.1' ? util.format('http://%s:%s/', SERVER, PORT) : 'http://' + req.headers.host + '/'
// // 		};
// // 		res.json({
// // 			response_type: 'in_channel',
// // 			text: requestString,
// // 			attachments: [{
// // 				fallback: requestString,
// // 				image_url: 'http://' + SERVER + ':' + PORT + '/' + mathObjects[0].output,
// // 			}, ],
// // 		});
// // 		res.end();
// // 	};
// // 	var promiseError = function(error) {
// // 		log.info('Error in typesetting:');
// // 		log.info(error);
// // 		res.end(); // Empty 200 response.
// // 	};
// // 	typesetPromise.then(promiseSuccess, promiseError);
// // });