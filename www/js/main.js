$(function() {
    function dictReady(dict) {
        // Need to start the game
        var gameUI = new GameUI({
            el: "#main",

            // Pass the dictionary into the game
            dict: dict,

            // Get the seed from the query string (if it exists)
            // and set the seed on the game
            seed: parseInt((/game=(\d+)/.exec(location.search) || [0,0])[1])
        });
    }

    // See if the property that we want is pre-cached in the localStorage
    if (window.localStorage !== null && "gameDict" in window.localStorage) {
        dictReady(window.localStorage.gameDict);

    // Load in the dictionary from the server
    } else {
        $.ajax({
            url: cdnHREF + "js/en-dict.js",
            dataType: "jsonp",
            jsonp: false,
            jsonpCallback: "dictLoaded",
            success: function(txt) {
                // Cache the dictionary, if possible
                if (window.localStorage !== null) {
                    window.localStorage.gameDict = txt;
                }

                dictReady(txt);
            }
            // TODO: Add error/timeout handling
        });
    }
});