const Twitter = require('twitter');
const authAPI = require('./config/twitter.js');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const Replies = require('./db.js').Replies;
const Users = require('./db.js').Users;
const resolveReplies = require('./getReplies.js');
const port = process.env.PORT || 3001;

var app = express();

// Logging and parsing
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

app.get('/health', (req, res) => {
  res.writeHead(200);
  res.end('healthy');
})

app.get('/replies/:tweetId/:parentTweetId/:userScreenName/:viewerId', async (req, res) => {
    try {
      let tweetId = req.params.tweetId;
      let parentTweetId = Number(req.params.parentTweetId) ? req.params.parentTweetId : 0;
      let screenName = req.params.userScreenName;
      let viewerId = req.params.viewerId;
      let tweet = await Replies.findOne({id: tweetId});
      if (tweet && tweet.replies) {
        res.writeHead(200);
        res.end(JSON.stringify([tweet.replies.parentTweets, tweet.replies.authorReplies, tweet.replies.otherReplies]))
      }
      let viewer = await Users.findOne({id: viewerId});
      let tokenKey = viewer.twitterTokenKey;
      let tokenSecret = viewer.twitterTokenSecret;
      let client = new Twitter({
        consumer_key: authAPI.TWITTER_CONSUMER_KEY,
        consumer_secret: authAPI.TWITTER_CONSUMER_SECRET,
        access_token_key: tokenKey,
        access_token_secret: tokenSecret
      });
      let replies = await resolveReplies(client, tweetId, parentTweetId, screenName);
      res.writeHead(200);
      res.end(replies);
    } catch(err) {
      console.log('ERROR in /replies/:tweetId/:userScreenName/:viewerId', err);
      res.writeHead(404);
      res.end(err);
    }
})

app.listen(port, () => {
	console.log(`listening on port ${port}`);
})
