/* eslint-disable no-console */

const COMMAND = 'demand';
const ENDPOINT_TYPE = 'POST';
const ENDPOINT = `/slash-command-${COMMAND}`;

/* setup endpoint here */

module.exports = function prepareRoute({ router, appEnv, log }) {
	const { isValidSlackClientToken, debugLogger, processRequestPromise, prepareToHandleSlackSlashCommand } = appEnv;

	const availableSubCommands = require(`./${COMMAND}-subcommands/`);
	const availableSubCommandsMsg = `Usage: \`/${COMMAND} [sub-command] [details]\`\n\n*Available Sub-Commands:*\n${Object.keys(availableSubCommands).map(k => `  - ${availableSubCommands[k].description ? availableSubCommands[k].description : `\`${k}\``}`).join('\n')}`;

	debugLogger(`Registering end point: ${ENDPOINT_TYPE} ${ENDPOINT}`);
	debugLogger(`Usage hints:\n${availableSubCommandsMsg}`);

	router[ENDPOINT_TYPE.toLowerCase()](ENDPOINT, (req, res) => {
		if (!isValidSlackClientToken(req.body.token)) {
			log.warn(`Invalid Slack client token (${ENDPOINT_TYPE} ${ENDPOINT}):`, req.body.token);
			res.status(401).send();
			return;
		}

		const { respondNow, SLACK_TEAM, SLACK_CHANNEL, subCommand, reqInfo, tools } = prepareToHandleSlackSlashCommand({ req, res });

		const pHandler = new Promise(resolve => {
			if (!!availableSubCommands[subCommand]) {
				return availableSubCommands[subCommand](reqInfo, tools);
			} else {
				if (!!SLACK_TEAM && !!SLACK_CHANNEL) {
					respondNow({
						text: `${availableSubCommandsMsg}\n\nAlso, I usually hang out <slack://channel?team=${SLACK_TEAM}&id=${SLACK_CHANNEL}|in this channel>. (Just mute the channel.)`,
					});
				} else {
					respondNow({
						text: availableSubCommandsMsg,
					});
				}
				resolve();
			}
		});

		processRequestPromise({ p: pHandler, res });
	});
};
