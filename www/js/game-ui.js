var GameUI = Backbone.View.extend({
    options: {
        rackSize: 7,
        maxTiles: -1,
        scaledScore: false,
        useMultiplier: false,

        scale: 1.0
    },

    events: {
        "click .saveword": "submitWord"
    },

    initialize: function(options) {
        var self = this;

        this.updateTimer = new UpdateTimer({
            size: 100
        });

        this.rack = new Rack({
            rackSize: this.options.rackSize
        });

        // Expand the rack to take up the full width
        this.options.scale = $(window).width() / this.rack.rackWidth();
        this.rack.options.scale = this.options.scale;

        this.initGame(options);

        this.render();
        this.bind();
    },

    initGame: function(options) {
        options = options || {};

        if (this.game) {
            options.dict = this.game.dict;
        }

        // Initialize a copy of the game
        this.game = new Game({
            maxTiles: this.options.maxTiles,
            rackSize: this.options.rackSize,
            scaledScore: this.options.scaledScore,
            useMultiplier: this.options.useMultiplier,
            seed: options.seed,
            dict: options.dict
        });

        this.rack.off("swap");

        this.rack.on("swap", _.bind(function(a, b) {
            this.game.swap(a, b);
        }, this));

        // Attach all the game events
        for (var method in this.gameEvents) {
            this.game.on(method, _.bind(this.gameEvents[method], this));
        }
    },

    bind: function() {
        this.$el.on("click", ".restart", _.bind(function() {
            this.toggleOverlay("endgame", false);
            this.restart();
        }, this));
    },

    render: function() {
        var $pointsBar = $("<div>")
            .addClass("buttons")
            .html([
                // Render the update timer
                this.updateTimer.render().el,

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
                            .text("points")
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

        var $endGame = $("<div>")
            .addClass("endgame hidden")
            .hide()
            .html([
                $("<div>")
                    .addClass("points"),
                $("<button>")
                    .addClass("restart")
                    .text("Play Again")
            ]);

        var $overlay = $("<div>")
            .addClass("background overlay hidden")
            .hide()
            .appendTo("body");

        var $board = $("<div>")
            .addClass("board")
            .html([
                // Insert the points bar
                $pointsBar,

                // Render the tile rack
                this.rack.render().el,

                // Add the end of game overlay
                $endGame,

                // Insert the button bar
                $buttons
            ]);

        this.$el.html([
            $overlay,
            $endGame,
            $board
        ]);

        this.$el.find(".board, .endgame")
            .css({
                transform: "translateY(-50%) scale(" +
                    this.options.scale + ")",
                width: this.rack.rackWidth()
            });

        return this;
    },

    toggleOverlay: function(name, toggle) {
        var $elems = this.$el.find(".background, ." + name);

        if (toggle) {
            $elems.addClass("hidden").show();
        } else {
            $elems.removeClass("hidden").show();
        }

        requestAnimationFrame(function() {
            $elems.toggleClass("hidden", !toggle);

            if (!toggle) {
                setTimeout(function() {
                    $elems.hide();
                }, 300);
            }
        });
    },

    start: function() {
        this.game.start();
    },

    reset: function() {
        this.rack.reset();
        this.game.reset();
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
                    nearEnd,
                    !!this.game.foundWord
                );

                if (!this.game.foundWord && nearEnd) {
                    this.rack.setCouldDrop(true);
                }

                if (timeDiff >= totalTime) {
                    clearInterval(this.circleTimer);
                }
            }, this), 13);
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

            this.$el.find(".points").text(this.game.score);
            this.$el.find(".multiplier")
                .text(Math.round(result.lengthMultiplier) + "x");
            this.$el.find(".streak-bar .bar")
                .css("width", (result.streak * 10) + "%");
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
            this.rack.removeTiles(this.options.rackSize);

            this.toggleOverlay("endgame", true);
        }
    }
});
