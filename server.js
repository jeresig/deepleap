var fs = require("fs"),
	http = require("http"),
	
	// Should switch to 80 when ready-to-go
	port = 80,
	
	// Hosted on another dummy server, for now
	cdn = "//localhost:8888/deepleap/";
	
fs.readFile( "index.html", "utf8", function( err, data ) {
	data = data.replace( /(src|href)="\/?(?!http)/ig, '$1="' + cdn );
	
	http.createServer(function( request, response ) {
		response.writeHead( 200, { "Content-type": "text/html" } );
		response.end( data );
		
		// TODO: Write logic for handling score submissions, score checking, etc.
	}).listen( port );
});
