const _ = require('underscore');
const axios = require('axios');

module.exports = function({ SLACK_APP_CLIENT_VERIFICATION_TOKEN, SLACK_BOT_TOKENS, SLACK_TRIGGERS = [], SLACK_WEBHOOK_URLS, DEBUG, SLACK_TEAM, SLACK_CHANNEL, GOOGLE_API_KEY } = {}) {
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

	function makeHeadAndTailOf(s, delimiter = ' ') {
		const split = s.split(delimiter);
		const head = split.shift();
		const tail = split.join(delimiter);
		return { head, tail };
	}
	const googleAPIClient = require('./services/google')(GOOGLE_API_KEY);

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
		prepareToHandleSlackSlashCommand({ req, res }) {
			const { team_id: teamId, team_domain: teamDomain, channel_id: channelId, channel_name: channelName, user_id: userId, user_name: userName, command: command, text: text, response_url: responseUrl } = req.body;
			const { head: subCommand, tail: subCommandDetails } = makeHeadAndTailOf(text);
			const reqInfo = { subCommand, subCommandDetails, teamId, teamDomain, channelId, channelName, userId, userName, command, text };
			const tools = { respondNow, respondLater, respondNowInChannel, respondLaterInChannel, respondNowEphemeral, respondLaterEphemeral, DEBUG, SLACK_TEAM, SLACK_CHANNEL, googleAPIClient, debugLogger, debugErrorLogger };
			const requestId = Math.floor(Math.random() * 9000000 + 1000000);
			debugLogger(`[${requestId}] Slack Slash Command Received:`, req.body);
			function respondNow(r) {
				debugLogger(`[${requestId}] Sending response:`, r);
				res.json(r);
			}
			function respondLater(r) {
				debugLogger(`[${requestId}] Sending delayed response:`, r);
				axios.post(responseUrl, r);
			}
			function respondNowInChannel(r) {
				r = _.extend({}, r);
				r.response_type = 'in_channel';
				debugLogger(`[${requestId}] Sending response (in channel):`, r);
				res.json(r);
			}
			function respondLaterInChannel(r) {
				r = _.extend({}, r);
				r.response_type = 'in_channel';
				debugLogger(`[${requestId}] Sending delayed response (in channel):`, r);
				axios.post(responseUrl, r);
			}
			function respondNowEphemeral(r) {
				r = _.extend({}, r);
				if (r.hasOwnProperty('response_type')) {
					delete r.response_type;
				}
				debugLogger(`[${requestId}] Sending response (ephemeral):`, r);
				res.json(r);
			}
			function respondLaterEphemeral(r) {
				r = _.extend({}, r);
				if (r.hasOwnProperty('response_type')) {
					delete r.response_type;
				}
				debugLogger(`[${requestId}] Sending delayed response (ephemeral):`, r);
				axios.post(responseUrl, r);
			}

			return {
				teamId, teamDomain, channelId, channelName, userId, userName, command, text, responseUrl,
				subCommand, subCommandDetails,
				respondNow, respondLater, respondNowInChannel, respondLaterInChannel, respondNowEphemeral, respondLaterEphemeral,
				reqInfo, tools,
			};
		},
		processRequestPromise({ p, res }) {
			p
				.then(() => {
					res.end();
				})
				.catch(error => {
					debugErrorLogger('Error:', error, !!error.stack ? `\n${error.stack}` : '');
					res.status(500).send();
				});
		},
		makeHeadAndTailOf,
		googleAPIClient,
	};
};
