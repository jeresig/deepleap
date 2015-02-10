var Board = Backbone.View.extend({
    events: {
        "click .saveword": "submitWord"
    },

    initialize: function(options) {
        var self = this;

        this.rackSize = options.rackSize;
        this.scale = options.scale;
        this.user = options.user;

        this.updateTimer = new UpdateTimer({
            size: 100
        });

        this.rack = new Rack({
            rackSize: this.rackSize,
            scale: this.scale
        });
    },

    setUser: function(user) {
        this.user = user;

        if (this.scores) {
            this.scores.setUser(user);
        }
    },

    getUser: function() {
        return this.user;
    },

    render: function() {
        var $pointsBar = $("<div>")
            .addClass("buttons")
            .html([
                // Render the update timer
                this.updateTimer.render().el,

                $("<div>")
                    .addClass("tiles-left hidden")
                    .text("100"),

                // Render the streak bar and multiplier
                $("<div>")
                    .addClass("streak")
                    .html([
                        $("<span>")
                            .addClass("multiplier")
                            .text("1x"),
                        $("<div>")
                            .addClass("streak-bar")
                            .html([
                                $("<div>").addClass("bar")
                            ])
                    ]),

                // Render the points area
                $("<span>")
                    .addClass("score")
                    .html([
                        $("<span>")
                            .addClass("points")
                            .text("0"),
                        $("<span>")
                            .addClass("text")
                            .html([
                                $("<span>").text("High: "),
                                $("<span>").addClass("highscore").text("0")
                            ])
                    ])
            ]);

        var $buttons = $("<div>")
            .addClass("buttons")
            .html([
                // Render the save button
                $("<button>")
                    .addClass("saveword")
                    .prop("disabled", true)
                    .text("Save Word")
            ]);

        this.$el
            .addClass("board")
            .css({
                transform: "translateY(-50%) scale(" + this.scale + ")",
                width: Rack.width(this.rackSize)
            })
            .html([
                // Insert the points bar
                $pointsBar,

                // Render the tile rack
                this.rack.render().el,

                // Insert the button bar
                $buttons
            ]);

        this.resetHighScore();

        return this;
    },

    initGame: function(options) {
        var self = this;

        if (!options) {
            if (!this.lastOptions) {
                console.error("No options passed to initGame.");
            } else {
                options = this.lastOptions;
            }
        }

        this.lastOptions = options;

        if (this.game) {
            options.dict = this.game.dict;
        }

        // Initialize a copy of the game
        this.game = new Game({
            type: options.type,
            lang: options.lang,
            rackSize: this.rackSize,
            seed: options.seed,
            dict: options.dict
        });

        this.scores = new Scores({
            id: options.id || options.type,
            type: options.type,
            server: this.server,
            user: this.user
        });

        this.rack.off("swap");

        this.rack.on("swap", function(a, b) {
            self.game.swap(a, b);
        });

        // Attach all the game events
        for (var method in this.gameEvents) {
            this.game.on(method, _.bind(this.gameEvents[method], this));
        }

        var showTilesLeft = this.game.maxTiles > 0;

        this.$el.find(".tiles-left")
            .toggleClass("hidden", !showTilesLeft)
            .text(this.game.maxTiles - this.game.droppedTiles);
    },

    start: function(options) {
        this.initGame(options);
        this.game.start();
    },

    reset: function() {
        this.rack.reset();
        this.game.reset();
        this.resetHighScore();
    },

    restart: function() {
        this.reset();
        this.initGame();
        this.start();
    },

    playback: function(data) {
        if (typeof data === "string") {
            data = $.parseJSON(data)
        }

        this.game.playback(false, data);
    },

    resetHighScore: function() {
        var self = this;

        if (!this.scores) {
            return;
        }

        this.scores.getHighScore(function(err, highScore) {
            self.updateHighScore(highScore);
        });
    },

    updateHighScore: function(score) {
        if (!score) {
            return;
        }

        var newHigh = this.curHighScore && score > this.curHighScore;

        if (newHigh || !this.curHighScore) {
            this.curHighScore = score;
            this.updateNumber(".score .highscore", this.curHighScore);

            // Save the high score
            this.scores.setHighScore(score);
        }

        this.$el.find(".score .text").toggleClass("active", !!newHigh);
    },

    updateNumber: function(selector, number) {
        var comma = $.animateNumber.numberStepFactories.separator(",");

        this.$el.find(selector).animateNumber({
            number: number,
            numberStep: comma
        });
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

        updated: function() {
            var self = this;
            var totalTime = this.game.updateRate * this.game.rack.length;
            var startTime = (new Date).getTime();

            // Make sure any previous circle animations are stopped
            clearInterval(this.circleTimer);

            this.circleTimer = setInterval(function() {
                var timeDiff = (new Date).getTime() - startTime;
                var nearEnd = totalTime - timeDiff <= totalTime / 4;

                self.updateTimer.update(
                    Math.min(timeDiff / totalTime, 1),
                    nearEnd,
                    !!self.game.foundWord
                );

                if (!self.game.foundWord && nearEnd) {
                    self.rack.setCouldDrop(true);
                }

                if (timeDiff >= totalTime) {
                    clearInterval(self.circleTimer);
                }
            }, 13);

            var showTilesLeft = this.game.maxTiles > 0;
            var $tilesLeft = this.$el.find(".tiles-left");

            $tilesLeft.toggleClass("hidden", !showTilesLeft);

            if (showTilesLeft) {
                this.updateNumber(".tiles-left",
                    this.game.maxTiles - this.game.droppedTiles);
            }
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
                .prop("disabled", !word.length);
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

            this.$el.find(".multiplier")
                .text(Math.round(result.lengthMultiplier) + "x");
            this.$el.find(".streak-bar .bar")
                .css("width", (result.streak * 10) + "%");

            this.updateNumber(".points", this.game.score);
            this.updateHighScore(this.game.score);
        },

        reset: function() {
            // Reset the UI elements
            this.$el
                .find(".words").empty().end()
                .find(".tilesleft, .points").text("0");

            this.$el.find(".multiplier")
                .text("1x");
            this.$el.find(".streak-bar .bar")
                .css("width", "0%");

            // Return the update timer to its start position
            this.updateTimer.reset();

            // Reset the tile rack
            this.rack.reset();

            // Stop the circle from updating
            clearInterval(this.circleTimer);
        },

        gameover: function() {
            this.rack.removeTiles(this.game.rackSize);

            // Record the score
            var state = this.game.getState();

            this.scores.addGame(state);

            this.trigger("gameover", state);
        }
    }
});