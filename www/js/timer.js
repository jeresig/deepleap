var UpdateTimer = Backbone.View.extend({
    tagName: "canvas",
    className: "update-timer",

    initialize: function(options) {
        this.width = options.width || options.size || 18;
        this.height = options.height || options.size || 18;
    },

    render: function() {
        // Set the dimensions of the canvas
        this.$el.attr({
            width: this.width,
            height: this.height
        });
        
        // Get the initial context of the canvas indicator canvas
        this.canvas = this.$el[0].getContext("2d");

        this.reset();

        return this;
    },

    reset: function() {
        if (!this.canvas) {
            return;
        }

        var canvas = this.canvas;
        var widthCenter = this.width / 2;
        var heightCenter = this.height / 2;

        canvas.clearRect(0, 0, this.width, this.height);
        canvas.fillStyle = "rgba(0,0,0,0.4)";
        canvas.beginPath();
        canvas.arc(widthCenter, heightCenter, widthCenter, 0, Math.PI * 2, true);
        canvas.closePath();
        canvas.fill();
    },

    update: function(amount, nearEnd, good) {
        if (!this.canvas) {
            return;
        }

        this.reset();

        var canvas = this.canvas;
        var widthCenter = this.width / 2;
        var heightCenter = this.height / 2;

        canvas.fillStyle = nearEnd ?
            "rgba(" + (good ? "0,255,0," : "255,0,0,") +
                (amount >= 1 ? "1" : "1") + ")" :
            "rgba(255,255,255,1)";
        canvas.beginPath();
        canvas.moveTo(widthCenter, heightCenter);
        canvas.arc(widthCenter, heightCenter, widthCenter - 1, -0.5 * Math.PI,
            (amount * (Math.PI * 2)) - (0.5 * Math.PI), false);
        canvas.moveTo(widthCenter, heightCenter);
        canvas.closePath();
        canvas.fill();
    }
});