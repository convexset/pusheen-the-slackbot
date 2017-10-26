const _ = require('underscore');

const subCommands = [
	'place-search'
];

module.exports = _.object(subCommands.map(k => [k, require(`./${k}`)]));
