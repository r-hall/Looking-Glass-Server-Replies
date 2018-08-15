const mongoose = require('mongoose'); 
mongoose.Promise = Promise;
const url = require('./config/db.js');
mongoose.connect(url);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  // we're connected!
  console.log('we are connected to lookingglass!');
});

var Schema = mongoose.Schema;

let userSchema = new Schema({
	id: {type: String, index: true, unique: true},
	twitterTokenKey: {type: String, default: ''},
	twitterTokenSecret: {type: String, default: ''},
	tokenNumber: Number
});

let Users = mongoose.model('Users', userSchema);

let friendsSchema = new Schema({
	id: {type: String, index: true, unique: true},
	friends: [{
		id_str: String,
		name: String,
		screen_name: String,
		profile_image_url_https: String,
		followers_count: Number,
		likes: Number,
		description: String,
		verified: Boolean
	}],
	refreshedFriendsDate: {type: Date, default: '1/1/2018'}
});

let Friends = mongoose.model('Friends', friendsSchema);

let repliesSchema = new Schema({
	id: {type: String, index: true, unique: true},
    replies: [Schema.Types.Mixed],
    rawHTML: String,
	refreshedRepliesDate: {type: Date, default: '1/1/2018'}
});

let Replies = mongoose.model('Replies', repliesSchema);

let tokenSchema = new Schema({
	id: {type: Number, index: true, unique: true},
	twitterTokenKey: String, 
	twitterTokenSecret: String,
	lastUsed: {type: Date, default: '1/1/2018'}
});

let Tokens = mongoose.model('Tokens', tokenSchema);

let tokenTrackerSchema = new Schema({
	id: {type: Number, index: true, unique: true, default: 1},
	totalTokens: {type: Number, default: 0},
	currentToken: {type: Number, default: 0}
})

let TokenTracker = mongoose.model('TokenTracker', tokenTrackerSchema);

let timelineSchema = new Schema({
	id: {type: String, index: true, unique: true},
	timeline: [Schema.Types.Mixed],
	refreshedTimelineDate: {type: Date, default: '1/1/2018'}
});

let Timelines = mongoose.model('Timelines', timelineSchema);

module.exports = {
    'Users': Users,
    'Tokens': Tokens,
    'TokenTracker': TokenTracker,
    'Friends': Friends,
    'Replies': Replies,
    'Timelines': Timelines
};
