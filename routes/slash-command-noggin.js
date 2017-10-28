/* eslint-disable no-console */

const axios = require('axios');
const _ = require('underscore');

const COMMAND = 'noggin';
const ENDPOINT_TYPE = 'POST';
const ENDPOINT = `/slash-command-${COMMAND}`;

const nogginEnvs = !!process.env.NOGGIN_ENV ? process.env.NOGGIN_ENV.trim().split(';').map(x => x.trim()).map(x => {
	const splt = x.split('|').map(y => y.trim());
	if (splt.length !== 5) {
		return null;
	}

	const podUrlExpr = splt[3];
	const podAddress = podUrlExpr.split('//').pop();

	function makePodUrl(name) {
		return podUrlExpr.replace('*', name);
	}

	function makePodAddress(name) {
		return podAddress.replace('*', name);
	}

	return {
		configName: splt[0].toLowerCase(),
		podName: splt[1],
		podPassword: splt[2],
		makePodUrl,
		makePodAddress,
		referenceServiceUrl: makePodUrl('reference-service'),
		marketServicesUrl: splt[4],
	};
}).filter(x => !!x) : null;
const nogginEnv = !!nogginEnvs ? _.object(nogginEnvs.map(x => [x.configName, x])) : null;

const _nogginAdminTokens = !!process.env.NOGGIN_ADMIN_TOKENS ? process.env.NOGGIN_ADMIN_TOKENS.trim().split(';').map(x => x.trim()).map(x => {
	const splt = x.split('|').map(y => y.trim());
	if (splt.length !== 2) {
		return null;
	}
	return {
		configName: splt[0],
		token: splt[1],
	};
}).filter(x => !!x) : null;
const nogginAdminTokens = _.object(_nogginAdminTokens.map(x => [x.configName, x]));

/* setup endpoint here */

module.exports = function prepareRoute({ router, appEnv, log }) {
	const { isValidSlackClientToken, debugLogger, debugErrorLogger, processRequestPromise, prepareToHandleSlackSlashCommand } = appEnv;

	(function updateAuthTokens() {
		let nextUpdate = 60 * 30;
		Promise.all(
			_.map(nogginEnv, (cfg, cfgName) => {
				const { podName, podPassword, makePodUrl, makePodAddress } = cfg;
				const podUrl = `${makePodUrl(podName)}/access_token`;
				const podAddress = makePodAddress(podName);

				debugLogger(`[noggin] Renewing auth. token on ${cfgName} (using ${podAddress})...`);
				return axios.put(podUrl, { pod_id: podAddress, password: podPassword })
					.then(r => {
						if (r.data.status !== 'SUCCESS') {
							throw r;
						}
						cfg.auth = {
							ts: new Date(),
							token: r.data.token,
						};
						debugLogger(`[noggin|auth|${cfgName}] ${r.request.res.statusCode} ${r.request.res.statusMessage}`);
					})
					.catch(r => {
						nextUpdate = 5;
						debugErrorLogger(`[noggin|auth|failure|${cfgName}] ${r.request.res.statusCode} ${r.request.res.statusMessage}:\n`, r.request._header);
					})
					.then(() => {
						if (!!nogginAdminTokens[cfgName]) {
							cfg.auth = {
								ts: null,
								token: nogginAdminTokens[cfgName].token,
							};
						}
					});
			})
		).then(() => null).catch(() => null).then(() => {
			appEnv.timersTimeout.nogginAuth = setTimeout(updateAuthTokens, nextUpdate * 1000);
		});
	})();

	(function updateSellerCache() {
		let nextUpdate = 60 * 60 * 3;
		Promise.all(
			_.map(nogginEnv, (cfg, cfgName) => {
				if (!nogginAdminTokens[cfgName]) {
					return Promise.resolve(null);
				}

				debugLogger(`[noggin] Refreshing seller cache for ${cfgName}...`);
				const { marketServicesUrl } = nogginEnv[cfgName];
				return axios.get(`${marketServicesUrl}/seller`, { headers: { 'X-Auth-Token': nogginAdminTokens[cfgName].token } })
					.then(r => {
						cfg.sellerCache = _.object(r.data.map(o => [o.id, o]));
						debugLogger(`[noggin|seller-cache-update|${cfgName}] ${r.request.res.statusCode} ${r.request.res.statusMessage}`);
					})
					.catch(r => {
						nextUpdate = 60 * 15;  // 15 min later
						debugErrorLogger(`[noggin|seller-cache-update|failure|${cfgName}] ${r.request.res.statusCode} ${r.request.res.statusMessage}:\n`, r.request._header);
					});
			})
		).then(() => null).catch(() => null).then(() => {
			appEnv.timersTimeout.nogginAuth = setTimeout(updateSellerCache, nextUpdate * 1000);
		});
	})();

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

		const { respondNow, subCommand, reqInfo, tools } = prepareToHandleSlackSlashCommand({ req, res });
		tools.nogginEnv = nogginEnv;

		const pHandler = new Promise(resolve => {
			if (!nogginEnv) {
				respondNow({
					text: 'Functionality not available.',
				});
				resolve();
				return;
			}

			if (!!availableSubCommands[subCommand]) {
				return availableSubCommands[subCommand](reqInfo, tools);
			} else {
				respondNow({
					text: availableSubCommandsMsg,
				});
				resolve();
				return;
			}
		});

		processRequestPromise({ p: pHandler, res });
	});
};
