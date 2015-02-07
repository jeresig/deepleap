var User = Backbone.Model.extend({
    initialize: function(options) {
        this.data = options.data;
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

    syncWithServer: function(callback) {
        var self = this;

        // TODO: Timeout after a certain amount

        // /auth/gamecenter
        $.ajax({
            type: "POST",
            url: self.server + "/auth/gamecenter",
            contentType: "application/json",
            data: JSON.stringify(this.auth),
            dataType: "json",
            success: function(results) {
                // Load updated user data
                user.updateFromData(results.user, callback);
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
    setCurrentUser: function(user) {
        // TODO: Notify gameUI
        this.currentUser = user;
    },

    getCurrentUser: function() {
        return this.currentUser;
    },

    createUserFromAuth: function(auth, callback) {
        var user = new User({
            data: {},
            auth: auth
        });

        user.syncWithServer(function() {
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