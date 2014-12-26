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

        showTiles: true
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
        var maxLeft = this.tileWidths(this.options.rackSize);

        $letters.on("mousedown", ".tile", function(e) {
            if (self.curDrag) {
                return;
            }

            var offset = $letters.offset();
            var scale = self.options.scale;

            self.curDrag = {
                x: e.offsetX * scale,
                y: e.offsetY * scale,
                offsetX: offset.left,
                offsetY: offset.top,
                item: $(this).data("tile"),
                pos: self.posFromLeft((e.pageX - offset.left) / scale)
            };

            var x = (e.pageX - self.curDrag.offsetX - self.curDrag.x);
            x /= scale;
            x = Math.min(Math.max(x, self.options.tileMargin), maxLeft);

            self.curDrag.item.setX(x);
            self.curDrag.item.setActive(true);
        });

        $(document).on("mousemove", function(e) {
            if (!self.curDrag) {
                return;
            }

            var x = (e.pageX - self.curDrag.offsetX - self.curDrag.x);
            x /= self.options.scale;
            x = Math.min(Math.max(x, self.options.tileMargin), maxLeft);

            self.curDrag.item.setX(x);

            var targetPos = self.posFromLeft(x +
                (self.options.tileWidth / 2));

            // Make sure we aren't trying to swap with itself
            if (self.curDrag.pos !== targetPos) {
                self.curDrag.item.setFound(false);
                self.trigger("swap", self.curDrag.pos, targetPos);
                self.curDrag.pos = targetPos;
            }

            e.preventDefault();
        });

        $(document).on("mouseup", function() {
            if (!self.curDrag) {
                return;
            }

            self.curDrag.item.setActive(false);
            self.curDrag.item.setX(self.tileWidths(self.curDrag.pos + 1));
            self.curDrag = null;
        });
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

    foundWord: function(word) {
        _.forEach(this.tiles, function(tile, i) {
            tile.setFound(i < word.length);
        });
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
    },

    swap: function(activePos, thisPos) {
        var a = this.tiles[activePos],
            b = this.tiles[thisPos],
            activeLeft = Math.max(this.tileWidths(activePos + 1), 0),
            thisLeft = Math.max(this.tileWidths(thisPos + 1), 0);

        // Move the current tile
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
            size:  this.options.tileWidth,
            showTiles: this.options.showTiles
        });

        this.tiles.push(tile);
        $letters.append(tile.render().el);

        setTimeout(function() {
            tile.setX(tileLeft);
        }, 0);
    },

    reset: function() {
        // Empty out the tiles
        this.tiles = [];

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