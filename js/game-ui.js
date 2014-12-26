var GameUI = Backbone.View.extend({
    options: {
        rackSize: 7,
        maxTiles: -1,
        scaledScore: false,
        useMultiplier: false
    },

    events: {
        "click .saveword": "submitWord"
    },

    initialize: function() {
        var self = this;

        // Initialize a copy of the game
        this.game = new Game({
            maxTiles: this.options.maxTiles,
            rackSize: this.options.rackSize,
            scaledScore: this.options.scaledScore,
            useMultiplier: this.options.useMultiplier
        });

        this.updateTimer = new UpdateTimer();

        this.rack = new Rack({
            el: this.$el.find(".letters-group"),
            rackSize: this.options.rackSize
        });

        this.bind();
        this.render();
    },

    bind: function() {
        this.rack.on("swap", _.bind(function(a, b) {
            this.game.swap(a, b);
        }, this));

        // Attach all the game events
        for (var method in this.gameEvents) {
            this.game.on(method, _.bind(this.gameEvents[method], this));
        }
    },

    render: function() {
        this.rack.render();

        this.$el.find(".drop").html(this.updateTimer.render().el);

        return this;
    },

    start: function() {
        this.game.start();
    },

    reset: function() {
        this.game.reset();
    },

    playback: function(data) {
        if (typeof data === "string") {
            data = $.parseJSON(data)
        }

        this.game.playback(false, data);
    },

    submitWord: function() {
        // Don't allow submission if we're replaying the game
        if (!this.game.logging) {
            return;
        }

        if (this.game.foundWord) {
            this.game.update();
        }
    },

    gameEvents: {
        swap: function(activePos, thisPos) {
            this.rack.swap(activePos, thisPos);
        },

        updateDone: function() {
            var totalTime = this.game.updateRate * this.game.rack.length;
            var startTime = (new Date).getTime();

            // Make sure any previous circle animations are stopped
            clearInterval(this.circleTimer);

            this.circleTimer = setInterval(_.bind(function() {
                var timeDiff = (new Date).getTime() - startTime;
                var nearEnd = totalTime - timeDiff <= totalTime / 4;

                this.updateTimer.update(
                    Math.min(timeDiff / totalTime, 1),
                    nearEnd
                );

                if (!this.game.foundWord && nearEnd) {
                    /*
                    var firstTile = $(this.spanLetters[0]);

                    if (firstTile.hasClass("dropsoonA")) {
                        firstTile.removeClass("dropsoonA")
                            .addClass("dropsoonB");

                    } else {
                        firstTile.removeClass("dropsoonB")
                            .addClass("dropsoonA");
                    }
                    */
                }

                if (timeDiff >= totalTime) {
                    clearInterval(this.circleTimer);
                }
            }, this), totalTime / 200);
        },

        dropTile: function(letter) {
            this.rack.dropTile(letter);

            // Let the user know how many
            this.$el.find(".tilesleft")
                .text(this.game.maxTiles - this.game.droppedTiles > 0 ?
                    this.game.maxTiles - this.game.droppedTiles :
                    "No");
        },

        removeTiles: function(num) {
            this.rack.removeTiles(num);
        },

        foundWord: function(word) {
            this.rack.foundWord(word);

            this.$el.find(".saveword")
                .toggleClass("ui-disabled", !word.length);
        },

        updateScore: function(result) {
            $("<li>")
                .addClass(result.state ? "pass" : "fail")
                .html("<b>" + (result.total >= 0 ? "+" : "") + result.total +
                    ": " + result.word + ".</b> " +
                    (result.state ?
                        result.num + " Points " +
                            (result.lengthBonus > 1 ? "+" +
                                result.lengthBonus.toFixed(1) +
                                "x Word Length. " : "") +
                            (result.multiplier > 1 ? "+" +
                                result.multiplier.toFixed(1) +
                                "x Multiplier. " : "") :
                        "Letter not used.")
               ).prependTo(this.$el.find(".words"));

            this.$el.find(".points").text(this.game.score);
            this.$el.find(".multiplier")
                .text(this.game.multiplier.toFixed(1));
        },

        reset: function() {
            // Reset the UI elements
            this.$el
                .find(".words").empty().end()
                .find(".tilesleft, .points").text("0");

            // Return the update timer to its start position
            this.updateTimer.reset();

            // Reset the tile rack
            this.rack.reset();

            // Stop the circle from updating
            clearInterval(this.circleTimer);
        },

        gameover: function() {
            console.log("Game Over");
        }
    }
});
