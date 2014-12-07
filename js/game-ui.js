$.widget("ui.game", {
    options: {
        // How tall and wide a tile should be
        tileWidth: 90,

        // How much space there should be between tiles
        tileMargin: 13,
        tileTopMargin: 6,

        // The size of the tile when it's actively selected
        activeTileWidth: 100,

        // TODO: Disabled for now, need to figure out a good result for this
        longLetters: "", // "gjpqy",

        showTiles: true
    },

    _create: function() {
        var rackWidth = this.options.tileMargin +
            ((this.options.tileMargin + this.options.tileWidth) * 9);
        var rackHeight = this.options.tileWidth +
            (this.options.tileTopMargin * 2);

        $(this.element)
            .find(".letters").css({
                width: rackWidth,
                height: rackHeight,
                fontSize: this.options.tileWidth,
                borderRadius: this.options.tileTopMargin
            }).end()
            .find(".letters-extra").css({
                width: rackWidth,
                height: rackHeight / 4,
                borderRadius: this.options.tileTopMargin,
                top: -1 * (this.options.tileTopMargin + 1)
            }).end()
            .find(".letters-extra-before").css({
                width: rackWidth
            }).end();

        // Initialize a copy of the game
        this.game = new Game();

        // Get the initial context of the circle indicator canvas
        try {
            this.circle = this.element.find(".drop")[0].getContext("2d");
        } catch(e) {}

        // Attach the various UI events
        this.element.find(".letters").bind({
            click: $.proxy(this.uiEvents.swap, this),
            mousedown: false
        });

        this.element.find(".saveword")
            .bind("click", $.proxy(this.uiEvents.submit, this));

        // Attach all the game events
        for (var method in this.gameEvents) {
            this.game.bind(method, $.proxy(this.gameEvents[method], this));
        }

        this.game.reset();
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

    uiEvents: {
        swap: function(e) {
            var tile = e.target;

            // Don't allow swapping if we're replaying the game
            // or if the tile that we want is no longer available
            if (!this.game.logging || tile.nodeName.toLowerCase() !== "span" ||
                 $(tile).hasClass("leaving")) {
                return;
            }

            // Make sure an old tile is no longer selected
            if (this.activeTile && !this.activeTile.parentNode) {
                this.activeTile = null;
            }

            // If a previous tile was already activated
            if (this.activeTile) {
                // Deactivate the originally-selected tile
                $(this.activeTile).removeClass("active").css({
                    width: this.options.tileWidth,
                    height: this.options.tileWidth,
                    fontSize: this.options.tileWidth,
                    lineHeight: this.options.tileWidth + "px",
                    marginTop: "",
                    marginLeft: ""
                });

                // Make sure we aren't trying to swap with itself
                if (this.activeTile !== tile) {
                    this.game.swap(
                        this.posFromLeft(this.activeTile),
                        this.posFromLeft(tile)
                   );
                }

                this.activeTile = null;

            } else {
                this.activeTile = tile;

                var offset = -1 *
                    (this.options.activeTileWidth - this.options.tileWidth);

                $(tile).addClass("active").css({
                    width: this.options.activeTileWidth,
                    height: this.options.activeTileWidth,
                    fontSize: this.options.activeTileWidth,
                    lineHeight: this.options.activeTileWidth + "px",
                    marginTop: offset,
                    marginLeft: offset / 2
                });
            }

            return false;
        },

        submit: function() {
            // Don't allow submission if we're replaying the game
            if (!this.game.logging) {
                return;
            }

            if (this.game.foundWord) {
                this.game.update();
            }
        }
    },

    gameEvents: {
        swap: function(activePos, thisPos) {
            $(this.spanLetters[0]).removeClass("dropsoonA dropsoonB");

            var $a = $(this.spanLetters[activePos]),
                $b = $(this.spanLetters[thisPos]),
                activeLeft = $a.css("left"),
                thisLeft = $b.css("left");

            // Move the current tile
            $b.animate({ left: activeLeft }, 300);

            // Finally move the originally selected tile
            $a.animate({ left: thisLeft }, 300);

            // Swap the position of the nodes in the store
            var oldNode = this.spanLetters[thisPos];
            this.spanLetters[thisPos] = this.spanLetters[activePos];
            this.spanLetters[activePos] = oldNode;
        },

        updateDone: function() {
            var totalTime = this.game.updateRate * this.game.rack.length,
                startTime = (new Date).getTime(),
                self = this;

            // Make sure any previous circle animations are stopped
            clearInterval(this.circleTimer);

            this.circleTimer = setInterval(function() {
                var timeDiff = (new Date).getTime() - startTime,
                    nearEnd = totalTime - timeDiff > totalTime / 4;

                self.updateCircle(Math.min(timeDiff / totalTime, 1), nearEnd);

                if (!self.game.foundWord && !nearEnd) {
                    var firstTile = $(self.spanLetters[0]);

                    if (firstTile.hasClass("dropsoonA")) {
                        firstTile.removeClass("dropsoonA")
                            .addClass("dropsoonB");

                    } else {
                        firstTile.removeClass("dropsoonB")
                            .addClass("dropsoonA");
                    }
                }

                if (timeDiff >= totalTime) {
                    clearInterval(self.circleTimer);
                }
            }, totalTime / 200);
        },

        dropTile: function(letter) {
            // Inject new letter into the UI
            var tileLeft = this.tileWidths(this.game.rack.length);
            var left = parseFloat($(this.spanLetters).last().css("left") || 0);
            var baseLeft = left + this.options.tileMargin +
                this.options.tileWidth;

            this.spanLetters.push($("<span>")
                .text(this.options.showTiles ? letter : "")
                .css({
                    backgroundPosition: Math.round(Math.random() * 1400) + "px",
                    width: this.options.tileWidth,
                    height: this.options.tileWidth,
                    lineHeight: (this.options.tileWidth -
                        (this.options.longLetters.indexOf(letter) > -1 ?
                            this.options.tileWidth / 4 : 0)) + "px",
                    top: this.options.tileTopMargin - 1,
                    left: baseLeft
                })
                .appendTo(this.element.find(".letters"))
                .animate({ left: tileLeft }, 500)[0]);

            // Let the user know how many
            this.element.find(".tilesleft")
                .text(this.game.maxTiles - this.game.droppedTiles > 0 ?
                    this.game.maxTiles - this.game.droppedTiles :
                    "No");
        },

        removeTiles: function(num) {
            this.spanLetters = $(this.spanLetters)
                .slice(0, num)
                    .addClass("leaving")
                    .fadeOut(300, function() {
                        $(this).remove();
                    })
                .end()
                .slice(num)
                    .animate({
                        left: "-=" + (this.tileWidths(num + 1) -
                            this.options.tileMargin)
                    }, 500)
                    .get();
        },

        foundWord: function(word) {
            $(this.spanLetters)
                .removeClass("found")
                .slice(0, word.length)
                    .addClass("found");

            this.element.find(".saveword")
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
               ).prependTo(this.element.find(".words"));

            this.element.find(".points").text(this.game.score);
            this.element.find(".multiplier")
                .text(this.game.multiplier.toFixed(1));
        },

        reset: function() {
            // Empty out the tiles
            this.spanLetters = [];
            this.element
                .find(".letters, .words").html("").end()
                .find(".tilesleft, .points").text("0");

            // Return the circle to its start position
            this.resetCircle();

            // Stop the circle from updating
            clearInterval(this.circleTimer);
        }
    },

    // Updating circle canvas
    resetCircle: function() {
        if (this.circle) {
            this.circle.clearRect(0, 0, 18, 18);

            this.circle.fillStyle = "rgba(0,0,0,0.4)";
            this.circle.beginPath();
            this.circle.arc(9, 9, 9, 0, Math.PI * 2, true);
            this.circle.closePath();
            this.circle.fill();
        }
    },

    updateCircle: function(amount, rate) {
        if (this.circle) {
            this.resetCircle();
            this.circle.fillStyle = rate ? "rgb(255,255,255)" : "rgb(255,0,0)";
            this.circle.beginPath();
            this.circle.moveTo(9, 9);
            this.circle.arc(9, 9, 8, -0.5 * Math.PI,
                (amount * (Math.PI * 2)) - (0.5 * Math.PI), false);
            this.circle.moveTo(9, 9);
            this.circle.closePath();
            this.circle.fill();
        }
    },

    tileWidths: function(num) {
        return (num * this.options.tileMargin) +
            ((num - 1) * this.options.tileWidth);
    },

    posFromLeft: function(node) {
        return (parseFloat($(node).css("left")) - this.options.tileMargin) /
            (this.options.tileMargin + this.options.tileWidth);
    }
});
