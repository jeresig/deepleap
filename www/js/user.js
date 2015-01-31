var User = Backbone.Model.extend({
    
});

User.autoAuth = function() {
    document.addEventListener("deviceready", function() {
        if (typeof gamecenter !== "undefined") {
            gamecenter.auth(function(user) {
                gameUI.setUser(user);
            }, function() {
                // Failure.
            });
        }
    }, false);
};