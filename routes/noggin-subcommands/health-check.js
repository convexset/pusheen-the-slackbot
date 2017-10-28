// const _ = require('underscore');
// const superb = require('superb');
const axios = require('axios');

module.exports = function healthCheck({ subCommandDetails }, { respondNow, respondLater, debugLogger, debugErrorLogger, nogginEnv }) {
	return new Promise(resolve => {
		const cfgName = subCommandDetails.toLowerCase().trim();
		if (nogginEnv.hasOwnProperty(cfgName)) {
			if (!!nogginEnv[cfgName].auth) {
				respondNow({
					text: `Performing health check for \`${cfgName}\`...`,
				});

				const { marketServicesUrl, referenceServiceUrl } = nogginEnv[cfgName];

				const services = [
					'card', 'credit', 'email', 'image', 'podfest', 'seller', 'profile', 'payment'
				];
				const ps = services.map(svcName => {
					return axios.get(`${marketServicesUrl}/${svcName}/health`)
						.then(r => {
							debugLogger(`[health-check|${cfgName}|${svcName}-service] ${r.request.res.statusCode} ${r.request.res.statusMessage}:`, r.data);
							respondLater({
								text: `Health Check Result for \`${cfgName}/${svcName}-service\` ⟶ _Success_: \`${r.request.res.statusCode} ${r.request.res.statusMessage}\` (${r.data})`
							});
						})
						.catch(r => {
							debugErrorLogger(`[health-check|failure|${cfgName}|${svcName}-service] ${r.request.res.statusCode} ${r.request.res.statusMessage}:\n`, r.request._header);
							respondLater({
								text: `Health Check Result for \`${cfgName}/${svcName}-service\` ⟶ *FAILURE*: \`${r.request.res.statusCode} ${r.request.res.statusMessage}\` (${r.data})`
							});
						});
				});

				const pRef = axios.get(`${referenceServiceUrl}/healthcheck`)
					.then(r => {
						debugLogger(`[reference-service-healthcheck|${cfgName}] ${r.request.res.statusCode} ${r.request.res.statusMessage}:`, r.data);
						respondLater({
							text: `Health Check Result for \`${cfgName}/reference-service\` ⟶ _Success_: \`${r.request.res.statusCode} ${r.request.res.statusMessage}\` (${r.data.message})`
						});
					})
					.catch(r => {
						debugErrorLogger(`[reference-service-healthcheck|failure|${cfgName}] ${r.request.res.statusCode} ${r.request.res.statusMessage}:\n`, r.request._header);
						respondLater({
							text: `Health Check Result for \`${cfgName}/reference-service\` ⟶ *FAILURE*: \`${r.request.res.statusCode} ${r.request.res.statusMessage}\` (${r.data.message})`
						});
					});

				ps.push(pRef);
				return Promise.all(ps);
			} else {
				respondNow({
					text: `No authentication token for \`${cfgName}\` yet. Try again in 10 seconds.`,
				});
				resolve();
			}
		} else {
			respondNow({
				text: `No such deployment: \`${cfgName}\` (available: ${Object.keys(nogginEnv).map(x => `\`${x}\``).join(', ')})`,
			});
			resolve();
		}
	});
};

module.exports.description = '`health-check [deployment]`: health check for `[deployment]`';
