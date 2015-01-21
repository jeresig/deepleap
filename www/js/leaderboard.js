var Leaderboard = Backbone.Model.extend({
    initialize: function(options) {
        this.type = options.type;
        this.prefix = "dl-" + options.type + "-";
    },

    setHighScore: function(highScore) {
        localforage.setItem(this.prefix + "highscore", highScore, function() {
            //console.log("High score saved.");
        });
    },

    getHighScore: function(callback) {
        // Update the high score
        localforage.getItem(this.prefix + "highscore", function(err, highScore) {
            callback(highScore);
        });
    }
});