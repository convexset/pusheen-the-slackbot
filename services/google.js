const _ = require('underscore');
const axios = require('axios');

module.exports = function prepare(apiKey) {
	const serviceUrls = {
		placeNearbySearch: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
		placeDetails: 'https://maps.googleapis.com/maps/api/place/details/json',
		placePhoto: 'https://maps.googleapis.com/maps/api/place/photo',
		imagesAnnotate: `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
	};

	function prepareGetUrl(url, params = {}) {
		const keys = Object.keys(params);
		if (keys.length === 0) {
			return url;
		} else {
			const queryString = keys.map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
			return `${url}?${queryString}`;
		}
	}
	return {
		placeNearbySearch(params = { location: '1.294656,103.858949' }) {
			params = _.extend({ key: apiKey }, params);
			if (typeof params.location !== 'string') {
				params.location = `${params.location.lat},${params.location.lng}`;
			}
			return axios.get(prepareGetUrl(serviceUrls.placeNearbySearch, params))
				.then(r => r.data);
		},
		getPlaceDetails(placeid) {
			const params = { key: apiKey, placeid };
			return axios.get(prepareGetUrl(serviceUrls.placeDetails, params))
				.then(r => r.data);
		},
		getPhotoUrl(photoreference, { maxWidth = 1024, maxHeight = 1024 } = {}) {
			const params = {
				key: apiKey,
				photoreference,
				maxwidth: maxWidth,
				maxheight: maxHeight
			};
			const config = {
				headers: {
					'Range': 'bytes=0-7'
				}
			};
			return axios.get(prepareGetUrl(serviceUrls.placePhoto, params), config)
				.then(r => {
					const result = {
						url: r.request.res.responseUrl,
						headers: _.extend({}, r.headers),
					};
					if (!!result.headers['content-range']) {
						// act rich
						const cr = result.headers['content-range'];
						if (cr.substr(0, 5) === 'bytes') {
							const sz = cr.split('/').pop();
							result.size = Number(sz);
							if (!Number.isNaN(result.size)) {
								result.headers['content-length'] = sz;
							}
						}
						delete result.headers['content-range'];

						if (!!result.headers['accept-ranges']) {
							delete result.headers['accept-ranges'];
						}
					}
					return result;
				});
		},
		getPhoto(photoreference, { maxWidth = 1024, maxHeight = 1024 } = {}) {
			const params = {
				key: apiKey,
				photoreference,
				maxwidth: maxWidth,
				maxheight: maxHeight
			};
			return axios.get(prepareGetUrl(serviceUrls.placePhoto, params), { responseType: 'stream' })
				.then(r => {
					return new Promise((resolve) => {
						// https://nodejs.org/api/stream.html
						//
						// The important concept to remember is that a Readable
						// will not generate data until a mechanism for either
						// consuming or ignoring that data is provided. If the
						// consuming mechanism is disabled or taken away, the
						// Readable will attempt to stop generating the data.
						//
						// For the stream noob... don't worry about data loss.

						const bufs = [];

						r.data.on('data', (chunk) => {
							if (!!chunk) {
								bufs.push(chunk);
							}
						});

						r.data.on('end', () => {
							const buf = Buffer.concat(bufs.filter(x => !!x));
							const result = {
								url: r.request.res.responseUrl,
								headers: r.headers,
								data: buf,
								size: buf.length,
							};
							resolve(result);
						});
					});
				});
		},
		imagesAnnotateByUrl(url) {
			const params = {
				requests: [{
					'image': { 'source': { 'imageUri': url } },
					'features': [{ type: 'LABEL_DETECTION' }, { type: 'TEXT_DETECTION' }]
				}]
			};
			return axios.post(serviceUrls.imagesAnnotate, params)
				.then(r => r && r.data && r.data.responses && r.data.responses[0]);
		},
		imagesAnnotate(buf) {
			const params = {
				requests: [{
					'image': { 'content': buf.toString('base64') },
					'features': [{ type: 'LABEL_DETECTION' }, { type: 'TEXT_DETECTION' }]
				}]
			};
			return axios.post(serviceUrls.imagesAnnotate, params)
				.then(r => r && r.data && r.data.responses && r.data.responses[0]);
		},
	};
};
