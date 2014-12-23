var UpdateTimer = Backbone.View.extend({
    width: 18,
    height: 18,

    tagName: "canvas",

    initialize: function() {
        
    },

    render: function() {
        // Set the dimensions of the canvas
        this.$el.attr({
            width: this.width,
            height: this.height
        });
        
        // Get the initial context of the canvas indicator canvas
        this.canvas = this.$el[0].getContext("2d");

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
        canvas.arc(widthCenter, heightCenter, 9, 0, Math.PI * 2, true);
        canvas.closePath();
        canvas.fill();
    },

    update: function(amount, nearEnd) {
        if (!this.canvas) {
            return;
        }

        this.reset();

        var canvas = this.canvas;
        var widthCenter = this.width / 2;
        var heightCenter = this.height / 2;

        canvas.fillStyle = nearEnd ? "rgb(255,0,0)" : "rgb(255,255,255)";
        canvas.beginPath();
        canvas.moveTo(widthCenter, heightCenter);
        canvas.arc(widthCenter, heightCenter, 8, -0.5 * Math.PI,
            (amount * (Math.PI * 2)) - (0.5 * Math.PI), false);
        canvas.moveTo(widthCenter, heightCenter);
        canvas.closePath();
        canvas.fill();
    }
});