/* eslint-disable no-console */

const axios = require('axios');

module.exports = function prepareRoute({ router, appEnv, log }) {
	const { isValidSlackClientToken, debugLogger, processRequestPromise, makeHeadAndTailOf } = appEnv;
	const { googleAPIClient } = appEnv;
	const { DEBUG, SLACK_TEAM, SLACK_CHANNEL } = appEnv;

	const availableSubCommands = require('./demand-subcommands/');
	const availableSubCommandsMsg = `Usage: \`/demand [sub-command] [details]\`\n\n*Available Sub-Commands:*\n${Object.keys(availableSubCommands).map(x => `  - \`${x}\``).join('\n')}`;

	router.post('/slash-command-demand', (req, res) => {
		debugLogger('Request (POST /demand-slash-command):', req.body);

		if (!isValidSlackClientToken(req.body.token)) {
			log.warn('Invalid token:', req.body.token);
			res.status(401).send();
			return;
		}

		const { team_id: teamId, team_domain: teamDomain, channel_id: channelId, channel_name: channelName, user_id: userId, user_name: userName, command: command, text: text, response_url: responseUrl } = req.body;
		function respondLater(r) {
			axios.post(responseUrl, r);
		}

		const { head: subCommand, tail: subCommandDetails } = makeHeadAndTailOf(text);

		const reqInfo = { req, res, subCommand, subCommandDetails, respondLater, teamId, teamDomain, channelId, channelName, userId, userName, command, text };
		const tools = { debugLogger, googleAPIClient };

		// const now = new Date();
		if (DEBUG) {
			// setTimeout(() => {
			// 	respondLater({ text: `Delayed response to command "${command} ${text}" at ${now}.\n\nUser Id: \`${userId}\`\nUser Name: \`${userName}\`\nChannel Id: \`${channelId}\`\nChannel Name: \`${channelName}\`\nTeam Id: \`${teamId}\`\nTeam Domain: \`${teamDomain}\`\n` });
			// }, 5000);
		}

		console.log(subCommand, subCommandDetails, reqInfo);
		// return;

		const pHandler = new Promise(resolve => {
			if (!!availableSubCommands[subCommand]) {
				return availableSubCommands[subCommand](reqInfo, tools);
			} else {
				if (!!SLACK_TEAM && !!SLACK_CHANNEL) {
					res.json({
						text: `${availableSubCommandsMsg}\n\nAlso, I usually hang out <slack://channel?team=${SLACK_TEAM}&id=${SLACK_CHANNEL}|in this channel>. (Just mute the channel.)`,
					});
				} else {
					res.json({
						text: availableSubCommandsMsg,
					});
				}
				resolve();
			}
		});

		processRequestPromise({ p: pHandler, res });
	});
};
