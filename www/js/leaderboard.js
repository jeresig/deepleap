var Leaderboard = Backbone.Model.extend({
    initialize: function(options) {
        this.type = options.type;
        this.prefix = "dl-" + options.type + "-";
    },

    addGame: function(state) {
        // TODO: Add in more identifying info
        var gameID = (new Date).getTime();

        // Update the high score
        this.getHighScore(_.bind(function(highScore) {
            if (!highScore || state.results.score > highScore) {
                this.setHighScore(state.results.score);
            }
        }, this));

        // Save scores
        localforage.getItem(this.prefix + "scores", _.bind(function(err, scores) {
            scores = scores || [];

            scores.push({
                id: gameID,
                // TODO: Add in the user account details
                results: state.results,
                saved: false,
                verified: false
            });

            localforage.setItem(this.prefix + "scores", scores, _.bind(function() {
                localforage.setItem(this.prefix + "score-" + gameID, state, _.bind(function() {
                    this.syncServer();
                }, this));
            }, this));
        }, this));
    },

    setHighScore: function(highScore, callback) {
        localforage.setItem(this.prefix + "highscore", highScore, function() {
            if (callback) {
                callback(highScore);
            }
        });
    },

    getHighScore: function(callback) {
        // Update the high score
        localforage.getItem(this.prefix + "highscore", function(err, highScore) {
            if (callback) {
                callback(highScore);
            }
        });
    },

    syncServer: function() {
        // Sync local scores with the server
    }
});