var Rack = Backbone.View.extend({
    tagName: "div",
    className: "letters-group",

    options: {
        // How tall and wide a tile should be
        tileWidth: 90,

        // How much space there should be between tiles
        tileMargin: 13,
        tileTopMargin: 6,

        scale: 1.0,

        showTiles: true,

        // Track if a tile could drop (near the end of the time limit)
        couldDrop: false
    },

    initialize: function(options) {
        for (var prop in options) {
            this.options[prop] = options[prop];
        }

        // The tiles held in the rack
        this.tiles = [];
    },

    bind: function() {
        var self = this;
        var $letters = this.$el.find(".letters");

        $letters.on("touchstart", ".tile", function(e) {
            var touch = e.originalEvent.targetTouches[0];

            self.handleTouchStart({
                target: touch.target,
                pageX: touch.pageX,
                offsetX: (touch.pageX - $(touch.target).offset().left) /
                    self.options.scale
            });
        });

        $letters.on("mousedown", ".tile", this.handleTouchStart.bind(this));

        $(document).on("touchmove", function(e) {
            e.preventDefault();

            var touch = e.originalEvent.targetTouches[0];

            if (touch) {
                self.handleTouchMove({
                    pageX: touch.pageX
                });
            }
        });

        $(document).on("mousemove", this.handleTouchMove.bind(this));

        $(document).on("touchend mouseup", function() {
            if (!self.curDrag) {
                return;
            }

            var curPos = self.tiles.indexOf(self.curDrag.item);

            self.curDrag.item.setActive(false);
            self.curDrag.item.setX(self.tileWidths(curPos + 1));
            self.curDrag = null;
        });
    },

    handleTouchStart: function(e) {
        if (this.curDrag) {
            return;
        }

        var $letters = this.$el.find(".letters");
        var maxLeft = this.tileWidths(this.options.rackSize);
        var offset = $letters.offset();
        var scale = this.options.scale;

        this.curDrag = {
            x: e.offsetX * scale,
            offsetX: offset.left,
            item: $(e.target).data("tile")
        };

        var x = (e.pageX - this.curDrag.offsetX - this.curDrag.x);
        x /= scale;
        x = Math.min(Math.max(x, this.options.tileMargin), maxLeft);

        this.curDrag.item.setX(x);
        this.curDrag.item.setActive(true);
    },

    handleTouchMove: function(e) {
        if (!this.curDrag) {
            return;
        }

        var maxLeft = this.tileWidths(this.options.rackSize);

        var x = (e.pageX - this.curDrag.offsetX - this.curDrag.x);
        x /= this.options.scale;
        x = Math.min(Math.max(x, this.options.tileMargin), maxLeft);

        this.curDrag.item.setX(x);

        var curPos = this.tiles.indexOf(this.curDrag.item);
        var targetPos = this.posFromLeft(x +
            (this.options.tileWidth / 2));

        // Make sure we aren't trying to swap with itself
        if (curPos !== targetPos) {
            this.curDrag.item.setFound(false);
            this.curDrag.item.setCouldDrop(false);
            this.trigger("swap", curPos, targetPos);
        }
    },

    render: function() {
        var rackWidth = this.rackWidth();
        var rackHeight = this.rackHeight();
        var topMargin = this.options.tileTopMargin;

        this.$el.width(rackWidth);

        $("<div>")
            .addClass("letters")
            .css({
                width: rackWidth,
                height: rackHeight,
                fontSize: this.options.tileWidth,
                borderRadius: topMargin,
                backgroundSize: rackWidth + "px " +
                    (this.options.tileWidth + topMargin) + "px"
            })
            .appendTo(this.$el);

        $("<div>")
            .addClass("letters-extra-before")
            .width(rackWidth)
            .appendTo(this.$el);

        $("<div>")
            .addClass("letters-extra")
            .css({
                width: rackWidth,
                height: rackHeight / 4,
                borderRadius: topMargin,
                top: -1 * (topMargin + 1),
                backgroundSize: rackWidth + "px " +
                    (rackHeight / 4) + "px"
            })
            .appendTo(this.$el)

        this.bind();

        return this;
    },

    setCouldDrop: function(couldDrop) {
        this.options.couldDrop = !!couldDrop;

        if (this.tiles.length > 0) {
            this.tiles[0].setCouldDrop(this.options.couldDrop);
        }
    },

    foundWord: function(word) {
        _.forEach(this.tiles, _.bind(function(tile, i) {
            tile.setFound(i < word.length);

            tile.setCouldDrop(i === 0 ?
                this.options.couldDrop :
                false);
        }, this));
    },

    removeTiles: function(num) {
        var self = this;

        // Stop the drag if the item being dragged is about to be
        // removed from the page
        if (this.curDrag) {
            var pos = this.tiles.indexOf(this.curDrag.item);
            if (pos >= 0 && pos < num) {
                this.curDrag = null;
            }
        }

        var leaving = this.tiles.slice(0, num);

        _.forEach(leaving, function(tile, i) {
            tile.setLeaving(true);
        });

        this.tiles = this.tiles.slice(num);

        _.forEach(this.tiles, function(tile, i) {
            tile.setX(self.tileWidths(i + 1));
        });

        this.options.couldDrop = false;
    },

    swap: function(activePos, thisPos) {
        var a = this.tiles[activePos];
        var b = this.tiles[thisPos];
        var activeLeft = Math.max(this.tileWidths(activePos + 1), 0);
        var thisLeft = Math.max(this.tileWidths(thisPos + 1), 0);

        // Move the current tile
        b.setCouldDrop(false);
        b.setX(activeLeft);

        // Finally move the originally selected tile
        // But only if we're not currently dragging it
        if (!a.active) {
            a.setX(thisLeft);
        }

        // Swap the position of the nodes in the store
        var oldNode = this.tiles[thisPos];
        this.tiles[thisPos] = this.tiles[activePos];
        this.tiles[activePos] = oldNode;
    },

    dropTile: function(letter) {
        var $letters = this.$el.find(".letters");
        var tileLeft = this.tileWidths(this.tiles.length + 1);

        // Inject new letter into the UI
        var tile = new Tile({
            letter: letter,
            x: this.rackWidth() + tileLeft,
            size: this.options.tileWidth,
            showTiles: this.options.showTiles
        });

        this.tiles.push(tile);
        $letters.append(tile.render().el);

        setTimeout(function() {
            tile.setX(tileLeft);
        }, 13);
    },

    reset: function() {
        // Empty out the tiles
        this.tiles = [];

        // Reset the could drop state
        this.options.couldDrop = false;

        this.$el.find(".letters").empty();
    },

    rackWidth: function() {
        return Rack.width();
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
}, {
    width: function() {
        var options = this.prototype.options;
        return options.tileMargin +
            ((options.tileMargin + options.tileWidth) *
            options.rackSize);
    }
});