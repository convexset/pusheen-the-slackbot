// const _ = require('underscore');
// const superb = require('superb');
const axios = require('axios');

module.exports = function listCards({ subCommandDetails }, { respondNow, respondLater, debugLogger, debugErrorLogger, nogginEnv }) {
	return new Promise(resolve => {
		const params = subCommandDetails.toLowerCase().trim().split(' ').filter(x => !!x);
		const cfgName = params.shift();
		if (nogginEnv.hasOwnProperty(cfgName)) {
			if (!!nogginEnv[cfgName].auth) {
				respondNow({
					text: `Listing cards for for \`${cfgName}\`...`,
				});

				const { marketServicesUrl } = nogginEnv[cfgName];

				return axios.get(`${marketServicesUrl}/card`, { headers: { 'X-Auth-Token': nogginEnv[cfgName].auth.token } })
					.then(r => {
						const cards = r.data;
						const listing = cards.map(({ id, caption, seller: { name: sellerName }, launchedDate, expectedEndDate, actualEndDate }, idx) => {
							return ` - \`${id}\` (${idx + 1}/${cards.length}):  ${caption} (${sellerName}) (${new Date(launchedDate)})`;
						}).join('\n');

						debugLogger(`[list-cards|${cfgName}] ${r.request.res.statusCode} ${r.request.res.statusMessage}:`, listing);
						respondLater({
							text: `Card listing for \`${cfgName}\` ⟶ _Success_: \`${r.request.res.statusCode} ${r.request.res.statusMessage}\`\n${listing}`
						});
					})
					.catch(r => {
						debugErrorLogger(`[list-cards|failure|${cfgName}] ${r.request.res.statusCode} ${r.request.res.statusMessage}:\n`, r.request._header);
						respondLater({
							text: `Card listing for \`${cfgName}\` ⟶ *FAILURE*: \`${r.request.res.statusCode} ${r.request.res.statusMessage}\` (${r.data})`
						});
					});
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

module.exports.description = '`list-cards [deployment]`: health check for `[deployment]`';
