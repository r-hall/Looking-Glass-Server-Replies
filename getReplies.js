const searchAPIEndpoint = 'search/tweets';
const Replies = require('./db.js').Replies;

// get replies sorted first by likes and then user follower count
const compare = (a,b) => {
  if (a.favorite_count > b.favorite_count)
    return -1;
  if (a.favorite_count < b.favorite_count)
    return 1;
  if (a.user.followers_count > b.user.followers_count)
  	return -1;
  if (a.user.followers_count < b.user.followers_count)
  	return 1;
  return 0;
}

// get replies to original tweetId
const getOtherReplies = (client, tweetId, params, userName) => {
	return new Promise( async (resolve, reject) => {
		try {
			let response = await client.get(searchAPIEndpoint, params);
			let statuses = response.statuses;
			let replies = [];
			for (let i = 0; i < statuses.length; i++) {
				if ((statuses[i].in_reply_to_status_id_str === tweetId) && (statuses[i].user.screen_name !== userName)) {
					replies.push(statuses[i]);
				}
			}
			if (replies.length) {
				replies.sort(compare);
				// get 3 to 7 replies
				let numReplies = 3 + Math.floor(Math.random() * 5);
				resolve(replies.slice(0, numReplies));
			} else {
				resolve([]);
			}
		} catch(err) {
			console.log('ERROR in getOtherReplies', err);
			reject(err);
		}
	})
}

const getIndividualReply = (client, tweetId, params, userName) => {
	return new Promise( async (resolve, reject) => {
		try {
			let response = await client.get(searchAPIEndpoint, params);
			let statuses = response.statuses;
			let authorReplies = [];
			let replies = [];
			for (let l = 0; l < statuses.length; l++) {
				if ((statuses[l].in_reply_to_status_id_str === tweetId) && (statuses[l].user.screen_name === userName)) {
					authorReplies.push(statuses[l]);
				} else if (statuses[l].in_reply_to_status_id_str === tweetId) {
					replies.push(statuses[l]);
				}
			}
			if (authorReplies.length) {
				resolve(authorReplies[0]);
			} else if (replies.length) {
				replies.sort(compare);
				resolve(replies[0]);
			} else {
				resolve(0);
			}
		} catch(err) {
			console.log('ERROR in getIndividualReply', err);
			reject(err);
		}
	})
}

const getMoreReplies = (client, repliesArray, numReplies, userName) => {
	return new Promise( async (resolve, reject) => {
		try {
			let promiseArray = []
			for (let j = 0; j < numReplies; j++) {
				let repliesLength = repliesArray[j].length;
				let params = {};
				params['q'] = `to:${repliesArray[j][repliesLength - 1].user.screen_name} -filter:retweets`;
				params['since_id'] = repliesArray[j][repliesLength - 1].id_str;
				params['count'] = 100;
				params['include_entities'] = true;
				params['tweet_mode'] = 'extended';
				promiseArray.push(getIndividualReply(client, repliesArray[j][repliesLength - 1].id_str, params, userName));
			}
			let newValues = await Promise.all(promiseArray);
			for (let j = 0; j < numReplies; j++) {
				if (newValues[j]) {
					repliesArray[j].push(newValues[j]);
				}
			}
			resolve(repliesArray);
		} catch(err) {
			console.log('ERROR in getMoreReplies', err);
			return err;
		}
	})
}

const getAllReplies = (client, tweetId, userName) => {
	return new Promise( async (resolve, reject) => {
		try {
			let params = {};
			params['q'] = `to:${userName} -filter:retweets`;
			params['since_id'] = tweetId;
			params['count'] = 100;
			params['include_entities'] = true;
			params['tweet_mode'] = 'extended';
			const chainLength = 2;
			let replies = [];
			replies = await getOtherReplies(client, tweetId, params, userName);
			// get replies for ~2/3 of the original replies
			let numReplies = replies.length;
			let repliesArray = [];
			if (replies.length) {
				for (let i = 0; i < replies.length; i++) {
					repliesArray.push([replies[i]]);
				}
				// get replies for ~2/3 of the original replies
				for (let i = 0; i < chainLength - 1; i++) {
					numReplies = Math.floor(2 * numReplies / 3);
					repliesArray = await getMoreReplies(client, repliesArray, numReplies, userName);
					// remove any instance of false that was added in getIndividualReply
					for (let k = 0; k < repliesArray.length; k++) {
						if (!repliesArray[k][repliesArray[k].length - 1]) {
							repliesArray[k] = repliesArray[k].slice(0, repliesArray[k].length - 1);
						}
					}
				}
			}
			resolve(repliesArray);
		} catch(err) {
			console.log('ERROR in getAllReplies', err);
			reject(err);
		}
	})
}

const makeAuthorReplyChain = (tweetId, replies, userName) => {
	let replyChain = [];
	let continueSearch = true;
	let found;
	let currentTweet = tweetId;
	while (continueSearch) {
		found = false;
		for (let i = 0; i < replies.length; i++) {
			if ((replies[i].in_reply_to_status_id_str === currentTweet) && (replies[i].user.screen_name === userName)) {
				replyChain.push(replies[i]);
				currentTweet = replies[i].id_str;
				found = true;
			}
		}
		if (!found) {
			continueSearch = false;
		} 
	}
	return replyChain;
}

const getAuthorReplies = (client, tweetId, userName) => {
	return new Promise( async (resolve, reject) => {
		try {
			let params = {};
			params['q'] = `from:${userName} -filter:retweets`;
			params['since_id'] = '' + (Number(tweetId) + 1);
			params['count'] = 100;
			params['include_entities'] = true;
			params['tweet_mode'] = 'extended';
			let response = await client.get(searchAPIEndpoint, params);
			let statuses = response.statuses;
			let replies = makeAuthorReplyChain(tweetId, statuses, userName);
			resolve(replies);
		} catch(err) {
			console.log('ERROR in getAuthorReplies', err);
			reject(err);
		}
	})
}

const getParentTweets = (client, tweetId, parentTweet, userName) => {
	return new Promise( async (resolve, reject) => {
		try {
			let tweets = [];
			if (parentTweet) {
				let continueSearch = true;
				while (continueSearch) {
					let endpoint = `statuses/show/${parentTweet}`;
					let params = {};
					params['include_entities'] = true;
					params['tweet_mode'] = 'extended';
					let tweet = await client.get(endpoint, params);
					tweets.push(tweet);
					if (!tweet.in_reply_to_status_id_str) {
						continueSearch = false;
					}
				}
			}
			resolve(tweets);
		} catch(err) {
			console.log('ERROR in getParentTweets', err);
			reject(err);
		}
	})
}

const resolveReplies = (client, tweetId, parentTweet, userName) => {
	return new Promise( async (resolve, reject) => {
		try {
			let replies = await Promise.all([getParentTweets(client, tweetId, parentTweet, userName), getAuthorReplies(client, tweetId, userName), getAllReplies(client, tweetId, userName)]);
			let query = {};
			query['id'] = tweetId;
			let updateObject = {};
			updateObject['replies'] = {
				parentTweets: replies[0],
				authorReplies: replies[1],
				otherReplies: replies[2]
			};
			updateObject['refreshedRepliesDate'] = new Date();
			Replies.findOneAndUpdate(query, updateObject, {upsert: true});
			resolve(JSON.stringify(replies));
		} catch(err) {
			console.log('ERROR in resolveReplies', err);
			reject(err);
		}
	})
}

module.exports = resolveReplies;