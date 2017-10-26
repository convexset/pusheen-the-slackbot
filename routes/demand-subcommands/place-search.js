/* eslint-disable no-console */
/* eslint-disable yoda */

module.exports = function placeSearch({ req, res, respondLater, subCommandDetails }, { debugLogger, googleAPIClient }) {
	return new Promise(resolve => {
		const latLng = parseLatLngPair(subCommandDetails);
		if (!!latLng) {
			res.json({
				text: `Searching Google Places...`,
			});
			resolve();

			googleAPIClient.placeNearbySearch({ location: latLng, radius: 1000 })
				.then(areaInfo => {
					areaInfo.results = areaInfo.results.splice(0, 5);

					debugLogger(`googleAPIClient.placeNearbySearch results for "${subCommandDetails}":`);
					debugLogger(`[googleAPIClient.placeNearbySearch|${JSON.stringify(latLng)}] ${areaInfo.results && areaInfo.results.length || 0} results`);

					const responseText = [
						`Hitting up Google Places for more information on ${areaInfo.results.length} places.`
						// `Hitting up Google Places for more information on ${areaInfo.results.length > 1 ? areaInfo.results.length - 1 : areaInfo.results.length} places.`
					];

					areaInfo.results.forEach((item) => {
						responseText.push(` - ${item.name}`);
					});

					respondLater({ text: responseText.join('\n') });

					areaInfo.results.forEach((item, idx) => {
						const placeId = item.place_id;
						const placeName = item.name;

						googleAPIClient.getPlaceDetails(placeId)
							.then(placeInfo => {
								debugLogger(`[googleAPIClient.getPlaceDetails|${placeId}|${idx + 1}/${areaInfo.results.length}] ${placeInfo.result.name || ''} (${placeInfo.result.photos && placeInfo.result.photos.length || 0} photos)`);

								if (placeInfo.result.photos && placeInfo.result.photos.length > 0) {
									const photoIdx = Math.floor(Math.random() * placeInfo.result.photos.length);
									const photo = placeInfo.result.photos[photoIdx];
									const photoRef = photo.photo_reference;

									const photoParams = {};
									if ((photo.width > 800) || (photo.height > 800)) {
										photoParams.maxWidth = 800;
										photoParams.maxHeight = 800;
									}

									// return googleAPIClient.getPhotoUrl(photoRef, photoParams);
									return googleAPIClient.getPhoto(photoRef, photoParams);
								} else {
									respondLater({ response_type: 'in_channel', text: `${placeName} (no photos)` });
									throw new Error('no-photos');
								}
							})
							.then(imageInfo => {
								const imageUrl = imageInfo.url;
								debugLogger(`[googleAPIClient.getPhotoUrl|${idx + 1}/${areaInfo.results.length}] at ${placeName}: ${imageInfo.url} (size: ${imageInfo.size})`);

								let annotationInfo = null;

								// googleAPIClient.imagesAnnotateByUrl(imageUrl)
								googleAPIClient.imagesAnnotate(imageInfo.data)
									.then(annotationResult => {
										if (!!annotationResult.error) {
											console.error('Image annotation failed:', annotationResult.error);
											annotationInfo = `> _Image annotation failed._ (code: ${annotationResult.error.code}; ${annotationResult.error.message})`;
											return;
										}

										debugLogger(`[googleAPIClient.imagesAnnotate] at ${placeName} (${imageUrl}):`, annotationResult);
										const annotations = [];

										const siglabelAnnotations = (annotationResult.labelAnnotations || []).filter(({ score }) => score >= 0.8);
										const otherlabelAnnotations = (annotationResult.labelAnnotations || []).filter(({ score }) => score < 0.8);
										if (siglabelAnnotations.length > 0) {
											annotations.push('*Significant Labels:*');
											siglabelAnnotations.forEach(labelInfo => {
												annotations.push(`  - ${labelInfo.description} (\`${labelInfo.score}\`)`);
											});
										}
										if (siglabelAnnotations.length > 0 && otherlabelAnnotations.length > 0) {
											annotations.push('');
										}
										if (otherlabelAnnotations.length > 0) {
											annotations.push(`*${siglabelAnnotations.length > 0 ? 'Other ' : ''}Labels:* ${otherlabelAnnotations.map(labelInfo => `${labelInfo.description} (\`${labelInfo.score}\`)`).join(', ')}`);
										}
										if ((siglabelAnnotations.length > 0 || otherlabelAnnotations.length > 0) && annotationResult.fullTextAnnotation && annotationResult.fullTextAnnotation.text) {
											annotations.push('\n');
										}

										if (annotationResult.fullTextAnnotation && annotationResult.fullTextAnnotation.text) {
											annotations.push('*Full Text Annotation:*');
											annotations.push(`> ${annotationResult.fullTextAnnotation.text.split('\n').join(' ')}`);
										}

										annotationInfo = annotations.join('\n');
									})
									.catch(e => {
										console.error('Image annotation failed:', e && e.response && e.response.status, e && e.response && e.response.data);
										annotationInfo = '> _Image annotation failed._';
									})
									.then(() => {
										if (!annotationInfo.trim()) {
											annotationInfo = '> _Image annotation failed._';
										}
										respondLater({
											response_type: 'in_channel',
											text: `_*${placeName}*_\n\n${annotationInfo}`,
											attachments: [{
												fallback: imageUrl,
												image_url: imageUrl,
											}, ],
										});
									});
							})
							.catch(err => {
								if (!err || err.message !== 'no-photos') {
									throw err;
								}
							})
							.catch(e => {
								debugLogger(`[Error|${idx + 1}/${areaInfo.results.length}] googleAPIClient.getPlaceDetails or googleAPIClient.getPhotoUrl.`, e && e.message || '');
							});
					});
				})
				.catch(e => {
					debugLogger(`[Error] googleAPIClient.placeNearbySearch results for "${subCommandDetails}" failed.`, e && e.message || '');
				});
		} else {
			res.json({
				response_type: 'in_channel',
				text: `Invalid input. Provide a lat-lon pair.`,
			});
			resolve();
		}
	});
};

function parseLatLngPair(s) {
	try {
		const split = s.split(',');
		const maybeLat = Number(split.shift().trim().split(' ').shift());
		const maybeLng = Number(split.shift().trim().split(' ').shift());
		if ((-90 < maybeLat) && (maybeLat < 90) && (-180 < maybeLng) && (maybeLng < 180)) {
			return {
				lat: maybeLat,
				lng: maybeLng,
			};
		}
	} catch (e) {
		return false;
	}
}
