var User = Backbone.Model.extend({
    initialize: function(options) {
        this.data = options.data;
        this.auth = options.auth;
    },

    updateFromData: function(data) {
        // TODO: Update user object
        // TODO: Update localforage record
    },

    syncWithServer: function() {
        var self = this;

        // /auth/gamecenter
        $.ajax({
            type: "POST",
            url: self.server + "/auth/gamecenter",
            contentType: "application/json",
            data: JSON.stringify(this.auth),
            dataType: "json",
            success: function(results) {
                // Load updated user data
                user.updateFromData(results.user);
            }
        });
    }
}, {
    setCurrentUser: function(user) {
        // TODO: Notify gameUI
        this.currentUser = user;
    },

    getCurrentUser: function() {
        return this.currentUser;
    },

    createUserFromAuth: function(auth) {
        
    },

    autoAuth: function() {
        localforage.getItem("snp-user", function(err, userData) {
            if (userData) {
                User.setCurrentUser(new User(userData)));
            }

            document.addEventListener("deviceready", function() {
                if (typeof gamecenter !== "undefined") {
                    gamecenter.auth(function(auth) {
                        var curUser = User.getCurrentUser();

                        if (curUser && !curUser.verifyAuth(auth) || !curUser) {
                            var user = User.createUserFromAuth(auth);
                            User.setCurrentUser(user);
                        }
                    }, function() {
                        // Failure.
                    });
                }
            }, false);
        });
    }
});