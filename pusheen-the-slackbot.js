/* eslint-disable no-console */

const fs = require('fs');

const http = require('http');
const https = require('https');

const _ = require('underscore');

const log = require('./log.js');

////////////////////////////////////////////////////////////////////////////////
// Environment
////////////////////////////////////////////////////////////////////////////////
const appEnv = (function() {
	const env = {
		timersInterval: {},
		timersTimeout: {},
		SLACK_TRIGGERS: ['Demand!', '/demand'],
	};
	['SLACK_BOT_TOKENS', 'SLACK_APP_CLIENT_ID', 'SLACK_APP_CLIENT_SECRET', 'SLACK_APP_CLIENT_VERIFICATION_TOKEN', 'HOST', 'SLACK_WEBHOOK_URLS', 'SLACK_TEAM', 'SLACK_CHANNEL', 'GOOGLE_API_KEY', 'DEBUG', 'HTTP_PORT', 'HTTPS_PORT', 'SSL_KEY', 'SSL_CERT', 'SLACK_APP_OAUTH_ACCESS_TOKEN', 'SLACK_APP_BOT_USER_OAUTH_ACCESS_TOKEN']
	.forEach(n => {
		env[n] = process.env[n] || null;
	});
	env.SLACK_BOT_TOKENS = (env.SLACK_BOT_TOKENS || '').split(';').map(x => x.trim()).filter(x => !!x);
	env.SLACK_WEBHOOK_URLS = (env.SLACK_WEBHOOK_URLS || '').split(';').map(x => x.trim()).filter(x => !!x);
	return _.extend(env, require('./pusheen-utils.js')(env));
})();

(function() {
	const { HTTP_PORT, HTTPS_PORT, SLACK_WEBHOOK_URLS, GOOGLE_API_KEY, SLACK_BOT_TOKENS, SLACK_APP_CLIENT_VERIFICATION_TOKEN } = appEnv;

	let haveCriticalFailure = false;

	if (!HTTP_PORT && !HTTPS_PORT) {
		console.error('Both HTTP_PORT and HTTPS_PORT undefined.');
		haveCriticalFailure = true;
	}

	if (SLACK_BOT_TOKENS.length === 0) {
		console.error('ADMIN_TOKENS not defined.');
		haveCriticalFailure = true;
	}

	if (!SLACK_APP_CLIENT_VERIFICATION_TOKEN) {
		console.error('SLACK_APP_CLIENT_VERIFICATION_TOKEN not defined.');
		haveCriticalFailure = true;
	}

	if (SLACK_WEBHOOK_URLS.length === 0) {
		console.error('SLACK_WEBHOOK_URLS not defined.');
		haveCriticalFailure = true;
	}

	if (!GOOGLE_API_KEY) {
		console.error('GOOGLE_API_KEY not defined.');
		haveCriticalFailure = true;
	}

	if (haveCriticalFailure) {
		// eslint-disable-next-line no-process-exit
		process.exit(1);
	}
})();

////////////////////////////////////////////////////////////////////////////////
// Create App
////////////////////////////////////////////////////////////////////////////////

const { app, registerServer } = require('./routes')(appEnv, log);

////////////////////////////////////////////////////////////////////////////////
// Start Server
////////////////////////////////////////////////////////////////////////////////
(function() {
	let someServiceStarted = false;

	const { helloWorldPayload, sendToSlack } = appEnv;
	const { HTTP_PORT, HTTPS_PORT, HOST, SSL_KEY, SSL_CERT, SLACK_BOT_TOKENS, SLACK_APP_CLIENT_VERIFICATION_TOKEN } = appEnv;

	// Create an HTTP service.
	if (!!HTTP_PORT) {
		const server = http.createServer(app);
		server.listen(HTTP_PORT);
		registerServer(server);

		const msg = `Pusheen Demands! is listening on http://${HOST}:${HTTP_PORT}/`;
		console.log(msg);
		helloWorldPayload.info.push(msg);

		console.log('');
		console.log('Make a test HTTP request with something like:');
		console.log(`curl -v -X POST http://${HOST}:${HTTP_PORT}/push-in --data '{"text": "Hello from curl.", "token": "${SLACK_BOT_TOKENS[0]}"}' -H "Content-Type: application/json"`);
		console.log('');

		someServiceStarted = true;
	}

	// Create an HTTPS service identical to the HTTP service.
	if (!!HTTPS_PORT && !!SSL_KEY && !!SSL_CERT) {
		const sslOptions = {
			key: fs.readFileSync(SSL_KEY),
			cert: fs.readFileSync(SSL_CERT)
		};
		const server = https.createServer(sslOptions, app);
		server.listen(HTTPS_PORT);
		registerServer(server);

		const msg = `Pusheen Demands! is listening on https://${HOST}:${HTTPS_PORT}/`;
		log.info(msg);
		helloWorldPayload.info.push(msg);

		console.log('');
		console.log('Make a test HTTPS request with something like:');
		console.log(`curl -v -X POST https://${HOST}:${HTTPS_PORT}/push-in --data '{"text": "Hello from curl.", "token": "${SLACK_BOT_TOKENS[0]}"}' -H "Content-Type: application/json"`);
		console.log('');

		someServiceStarted = true;
	}

	if (someServiceStarted) {
		console.log('');
		console.log(`Slack client verification token: ${SLACK_APP_CLIENT_VERIFICATION_TOKEN}`);
		console.log(`Valid slack bot tokens: ${SLACK_BOT_TOKENS.join(', ')}`);
		console.log('');

		sendToSlack({ text: '*Bot started.*' })
			.then(() => {
				helloWorldPayload.info.forEach(msg => {
					sendToSlack({ text: msg });
				});
			});
	} else {
		console.log('No services defined.');
	}
})();
////////////////////////////////////////////////////////////////////////////////
