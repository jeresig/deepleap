var Tile = Backbone.View.extend({
    tagName: "span",
    className: "tile",

    // NOTE: Need to figure out a good result for this
    longLetters: "", //"gjpqy",

    initialize: function(options) {
        this.x = options.x || 0;
        this.y = 0;
        this.z = 0;
        this.scale = 1.0;
        this.rotate = 0;

        this.showTiles = options.showTiles;
        this.size = options.size;
        this.letter = options.letter || "";
        this.isLongLetter = this.longLetters.indexOf(this.letter) > -1;
        this.backgroundPos = Math.round(Math.random() * 1400);

        this.active = false;
        this.found = false;
        this.leaving = false;
    },

    render: function() {
        this.$el
            .data("tile", this)
            .text(this.showTiles ? this.letter : "")
            .css({
                backgroundPosition: this.backgroundPos + "px",
                backgroundSize: this.size + "px " + this.size + "px",
                width: this.size,
                height: this.size,
                lineHeight: (this.size -
                    (this.isLongLetter ? this.size / 4 : 0)) + "px"
            });

        this.updateTransform();

        return this;
    },

    setActive: function(active) {
        this.active = !!active;

        this.$el.toggleClass("active", !!active);

        this.setScale(active ? 1.1 : 1.0);
    },

    setFound: function(found) {
        this.found = !!found;

        this.$el.toggleClass("found", !!found);
    },

    setCouldDrop: function(couldDrop) {
        this.couldDrop = !!couldDrop;

        if (couldDrop && !this.found) {
            if (!this.wiggleInterval) {
                var wiggle = 0;
                var self = this;

                this.wiggleInterval = setInterval(function() {
                    self.setRotate(wiggle % 2 === 0 ?
                        2 : -2);
                    wiggle += 1;
                }, 100);
            }
        } else {
            clearInterval(this.wiggleInterval);
            this.wiggleInterval = null;
            this.setRotate(0);
        }

        this.$el.toggleClass("coulddrop", !!couldDrop);
    },

    setLeaving: function(leaving) {
        clearTimeout(this.leavingTimer);

        this.leaving = !!leaving;

        this.$el.toggleClass("leaving", !!leaving);

        var self = this;
        this.leavingTimer = setTimeout(function() {
            self.remove();
        }, 300);
    },

    setScale: function(scale) {
        if (this.scale !== scale) {
            this.scale = scale;
            this.updateTransform();
        }
    },

    setRotate: function(rotate) {
        if (rotate !== this.rotate) {
            this.rotate = rotate;
            this.updateTransform();
        }
    },

    setX: function(x) {
        if (this.x !== x) {
            this.x = x;
            this.updateTransform();
        }
    },

    updateTransform: function() {
        this.$el.css("transform",
            "translate3d(" + this.x + "px," + this.y + "px," +
            this.z + "px) scale(" + this.scale + ") rotate(" +
            this.rotate + "deg)");
    },

    remove: function() {
        clearInterval(this.wiggleInterval);
        this.$el.remove();
    }
});