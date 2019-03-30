var User = Backbone.Model.extend({
    initialize: function(options) {
        this.data = options.data || {
            state: {
                scores: {}
            }
        };
        this.auth = options.auth;
    },

    updateFromData: function(data, callback) {
        this.data = data;
        this.cacheLocally(callback);
    },

    verifyAuth: function(auth) {
        if (this.auth) {
            return !!(this.auth.playerID === auth.playerID);
        }

        return false;
    },

    syncServer: function(callback) {
        var self = this;

        // /auth/gamecenter
        $.ajax({
            type: "POST",
            url: self.server + "/auth/gamecenter",
            contentType: "application/json",
            data: JSON.stringify(this.auth),
            dataType: "json",
            timeout: 5000,
            success: function(results) {
                // Load updated user data
                user.updateFromData(results.user, callback);
            },
            error: function() {
                callback();
            }
        });
    },

    cacheLocally: function(callback) {
        localforage.setItem("snp-user", this.toJSON(), function(err) {
            // Cached.
            if (callback) {
                callback(err);
            }
        });
    },

    toJSON: function() {
        return {
            data: this.data,
            auth: this.auth
        }
    }
}, {
    createUserFromAuth: function(auth, callback) {
        var user = new User({
            auth: auth
        });

        user.cacheLocally(function() {
            user.syncServer(function() {
                if (callback) {
                    callback(null, user);
                }
            });
        });
    },

    createAnonUser: function(callback) {
        var user = new User({});

        user.cacheLocally(function() {
            if (callback) {
                callback(null, user);
            }
        });
    },

    getCachedUser: function(callback) {
        localforage.getItem("snp-user", function(err, userData) {
            callback(err, userData ? new User(userData) : null);
        });
    },

    hasGameCenter: function() {
        return typeof gamecenter !== "undefined";
    }
});