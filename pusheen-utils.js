const axios = require('axios');

module.exports = function({ SLACK_APP_CLIENT_VERIFICATION_TOKEN, SLACK_BOT_TOKENS, SLACK_TRIGGERS = [], SLACK_WEBHOOK_URLS, DEBUG, GOOGLE_API_KEY } = {}) {
	const LC_TRIGGERS = SLACK_TRIGGERS.map(s => s.toLowerCase());
	const helloWorldPayload = {
		msg: 'Send Pusheen a Demand!',
		info: [],
	};

	function debugLogger() {
		if (DEBUG) {
			// eslint-disable-next-line no-console
			console.info('\n', ...arguments, '\n');
		}
	}

	function debugErrorLogger() {
		if (DEBUG) {
			// eslint-disable-next-line no-console
			console.error('\n', ...arguments, '\n');
		}
	}

	return {
		cleanRequestString: requestString => {
			requestString = (requestString || '').trim();
			LC_TRIGGERS.forEach(trigger => {
				if (requestString.toLowerCase().substr(0, trigger.length) === trigger) {
					requestString = requestString.substr(trigger.length);
				}
			});
			return requestString.trim();
		},
		sendToSlack(data = {}) {
			return Promise.all(
				SLACK_WEBHOOK_URLS.map(url => axios.post(url, data))
			);
		},
		isValidSlackClientToken: token => SLACK_APP_CLIENT_VERIFICATION_TOKEN === token,
		isValidSlackBotToken: token => SLACK_BOT_TOKENS.indexOf(token) !== -1,
		helloWorldPayload: helloWorldPayload,
		debugLogger,
		debugErrorLogger,
		processRequestPromise({ p, res }) {
			p
				.then(() => {
					res.end();
				})
				.catch(error => {
					debugErrorLogger('Error:', error);
					res.status(500).send();
				});
		},
		makeHeadAndTailOf(s, delimiter = ' ') {
			const split = s.split(delimiter);
			const head = split.shift();
			const tail = split.join(delimiter);
			return { head, tail };
		},
		googleAPIClient: require('./services/google')(GOOGLE_API_KEY),
	};
};
