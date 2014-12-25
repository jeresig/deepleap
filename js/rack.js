var Rack = Backbone.View.extend({
    options: {
        // How tall and wide a tile should be
        tileWidth: 90,

        // How much space there should be between tiles
        tileMargin: 13,
        tileTopMargin: 6,

        // TODO: Disabled for now, need to figure out a good result for this
        longLetters: "gjpqy",

        scale: 1.0,

        showTiles: true
    },

    initialize: function(options) {
        for (var prop in options) {
            this.options[prop] = options[prop];
        }

        // Expand the rack to take up the full width
        this.options.scale = $(window).width() / this.rackWidth();

        this.bind();
    },

    bind: function() {
        var self = this;
        var $letters = this.$el.find(".letters");
        var maxLeft = this.tileWidths(this.options.rackSize);

        $letters.on("mousedown", ".tile", function(e) {
            if (self.curDrag) {
                return;
            }

            var $this = $(this);
            var offset = $letters.offset();
            var scale = self.options.scale;

            self.curDrag = {
                x: e.offsetX * scale,
                y: e.offsetY * scale,
                offsetX: offset.left,
                offsetY: offset.top,
                $elem: $this,
                pos: self.posFromLeft((e.pageX - offset.left) / scale)
            };

            var x = (e.pageX - self.curDrag.offsetX - self.curDrag.x);
            x /= scale;
            x = Math.min(Math.max(x, self.options.tileMargin), maxLeft);

            self.curDrag.$elem.css("transform",
                "translateX(" + x + "px) scale(1.1)");

            $this.addClass("active");
        });

        $(document).on("mousemove", function(e) {
            if (!self.curDrag) {
                return;
            }

            var x = (e.pageX - self.curDrag.offsetX - self.curDrag.x);
            x /= self.options.scale;
            x = Math.min(Math.max(x, self.options.tileMargin), maxLeft);

            self.curDrag.$elem.css("transform",
                "translateX(" + x + "px) scale(1.1)");

            var targetPos = self.posFromLeft(x +
                (self.options.tileWidth / 2));

            // Make sure we aren't trying to swap with itself
            if (self.curDrag.pos !== targetPos) {
                self.curDrag.$elem.removeClass("found dropsoonA dropsoonB");
                self.trigger("swap", self.curDrag.pos, targetPos);
                self.curDrag.pos = targetPos;
            }

            e.preventDefault();
        });

        $(document).on("mouseup", function() {
            if (!self.curDrag) {
                return;
            }

            self.curDrag.$elem
                .removeClass("active")
                .css("transform", "translateX(" +
                    self.tileWidths(self.curDrag.pos + 1) + "px) scale(1.0)");

            self.curDrag = null;
        });
    },

    render: function() {
        var rackWidth = this.rackWidth();
        var rackHeight = this.rackHeight();
        var topMargin = this.options.tileTopMargin;

        this.$el.css("transform",
            "scale(" + this.options.scale + ")");

        this.$el.find(".letters").css({
            width: rackWidth,
            height: rackHeight,
            fontSize: this.options.tileWidth,
            borderRadius: topMargin
        });

        this.$el.find(".letters-extra").css({
            width: rackWidth,
            height: rackHeight / 4,
            borderRadius: topMargin,
            top: -1 * (topMargin + 1)
        });

        this.$el.find(".letters-extra-before").width(rackWidth);

        return this;
    },

    foundWord: function(word) {
        $(this.spanLetters)
            .removeClass("found")
            .slice(0, word.length)
                .addClass("found");
    },

    removeTiles: function(num) {
        var self = this;
        var $spanLetters = $(this.spanLetters);

        // Stop the drag if the item being dragged is about to be
        // removed from the page
        if (this.curDrag) {
            var pos = this.spanLetters.indexOf(this.curDrag.$elem[0]);
            if (pos >= 0 && pos < num) {
                this.curDrag = null;
            }
        }

        var $leaving = $spanLetters.slice(0, num).addClass("leaving");

        setTimeout(function() {
            $leaving.remove();
        }, 300);

        this.spanLetters = $spanLetters.slice(num)
            .css("transform", function(i) {
                return "translateX(" + self.tileWidths(i + 1) + "px) scale(1.0)";
            })
            .toArray();
    },

    swap: function(activePos, thisPos) {
        $(this.spanLetters[0]).removeClass("dropsoonA dropsoonB");

        var $a = $(this.spanLetters[activePos]),
            $b = $(this.spanLetters[thisPos]),
            activeLeft = Math.max(this.tileWidths(activePos + 1), 0),
            thisLeft = Math.max(this.tileWidths(thisPos + 1), 0);

        // Move the current tile
        $b.css("transform", "translateX(" + activeLeft + "px) scale(1.0)");

        // Finally move the originally selected tile
        if (!$a.hasClass("active")) {
            $a.css("transform", "translateX(" + thisLeft + "px) scale(1.0)");
        }

        // Swap the position of the nodes in the store
        var oldNode = this.spanLetters[thisPos];
        this.spanLetters[thisPos] = this.spanLetters[activePos];
        this.spanLetters[activePos] = oldNode;
    },

    dropTile: function(letter) {
        var self = this;
        var $letters = this.$el.find(".letters");

        // Inject new letter into the UI
        var tileLeft = this.tileWidths(this.spanLetters.length + 1);
        var tileWidth = this.options.tileWidth;

        var $tile = $("<span>")
            .addClass("tile")
            .text(this.options.showTiles ? letter : "")
            .css({
                backgroundPosition: Math.round(Math.random() * 1400) + "px",
                width: tileWidth,
                height: tileWidth,
                lineHeight: (tileWidth -
                    (this.options.longLetters.indexOf(letter) > -1 ?
                        this.options.tileWidth / 4 : 0)) + "px",
                transform: "translateX(" +
                    (this.rackWidth() + tileLeft) + "px) scale(1.0)"
            })
            .appendTo($letters);

        this.spanLetters.push($tile[0]);

        setTimeout(function() {
            $tile.css("transform", "translateX(" + tileLeft +
                "px) scale(1.0)");
        }, 0);
    },

    reset: function() {
        // Empty out the tiles
        this.spanLetters = [];

        this.$el.find(".letters").empty();
        
    },

    rackWidth: function() {
        return this.options.tileMargin +
            ((this.options.tileMargin + this.options.tileWidth) *
            this.options.rackSize);
    },

    rackHeight: function() {
        return this.options.tileWidth +
            (this.options.tileTopMargin * 2);
    },

    tileWidths: function(num) {
        return (num * this.options.tileMargin) +
            ((num - 1) * this.options.tileWidth);
    },

    posFromLeft: function(left) {
        return Math.floor((left - this.options.tileMargin) /
            (this.options.tileMargin + this.options.tileWidth));
    }
});