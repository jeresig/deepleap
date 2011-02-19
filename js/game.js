$(function(){
	// Letter data
	// Distribution of OSPD4 + OpenOffice en_US + Wiktionary English
	var data = {letters:{a:77,d:38,h:23,e:111,i:75,n:58,g:27,s:85,k:13,l:53,m:27,b:21,o:61,r:68,v:9,w:10,f:14,t:57,z:4,c:36,u:34,p:28,y:17,j:2,x:3,q:2},total:953};
	//  A 1 B 5 C 3 D 3 E 1 F 8 G 4 H 5 I 1 J 56 K 9 L 2 M 4 N 2 O 2 P 4 Q 56 R 2 S 1 T 2 U 3 V 12 W 11 X 37 Y 7 Z 28


	
	// Swapping Tiles
	var activeTile;

	// Handle tile swapping
	$("#letters").delegate("span", "click", function() {
		// Make sure an old tile is no longer selected
		if ( activeTile && !activeTile.parentNode ) {
			activeTile = null;
		}

		// If a previous tile was already activated
		if ( activeTile ) {
			// Deactivate it
			$(activeTile).removeClass( "active" );

			// Make sure we aren't trying to swap with itself
			if ( activeTile !== this ) {
				// Remember the original positions of the tiles
				var origPos = $(activeTile).position(),
					swapPos = $(this).position(),

					// Figure out which element's margins we should be padding
					adjacent = activeTile.nextSibling === this && this.nextSibling ||
						this.nextSibling === activeTile && activeTile.nextSibling ||
						[ activeTile.nextSibling, this.nextSibling ],

					// Reset everything after the animation is done
					swapDone = function() {
						$(adjacent).css( "marginLeft", "" );
						$(this).removeClass( "swapping" ).css( "left", "" );
					};

				// Dynamically calculate what the margin should be
				$(adjacent).css( "marginLeft",
					Math.abs( $(adjacent).position().left - (adjacent.nodeType ?
						Math.min( origPos.left, swapPos.left ) :
						Math.max( origPos.left, swapPos.left )) ) +
						parseFloat( $(adjacent).css("marginLeft") ) );

				// Move the current tile (via cloning)
				$(this)
					.clone()
					.insertAfter( activeTile )
					.addClass( "swapping" )
					.css( "left", swapPos.left )
					.animate( { left: origPos.left }, 350, swapDone );

				// Finally move the originally selected tile
				$(activeTile)
					.replaceAll( this )
					.addClass( "swapping" )
					.css( "left", origPos.left )
					.animate( { left: swapPos.left }, 350, swapDone );

				// Regenerate the list of letters
				letters = $("#letters span").map(function(){ return this.firstChild.nodeValue; }).get();
				findWord();
			}

			activeTile = null;

		} else {
			activeTile = this;
			$(this).addClass( "active" );
		}

		return false;
	});

	// Stop text selection
	$("#letters").mousedown(function(){
		return false;
	});

	$("#letters").dblclick(function(){
		if ( foundWord ) {
			clearInterval( timer );
			extractWord();
			doRemove = false;
			update();
		}
	});
	
	
	
	// Timer control
	var doRemove = false;
	var timer;
	var updateRate = 2000;

	function update(){
		if ( letters.length === 0 && numLetters > maxLetters ) {
			alert("Game Over!");
			return;
		}

		if ( doRemove && foundWord ) {
			if ( curFind ) {
				// Trigger on find done
			} else {
				extractWord();
				doRemove = false;
				
				findWord();
				update();
			}

		} else if ( !doRemove ) {
			var curLetters = max - $("#letters span").length;
			for ( var i = 0; i < curLetters; i++ ) {
				addLetter();
			}

			findWord();

			var totalTime = updateRate * letters.length;
			var endWarning = totalTime / 4;
			var count = 0, rate = 30, startTime = (new Date).getTime();

			if ( letters.length >= max || numLetters > maxLetters ) {
				// Disabled for now.
				//if ( !vowelCheck.test(letters) )
					//totalTime = 100;

				doRemove = true;
				// Temporarily disable the red background fade
				//$("#letters span:first").animate({ backgroundColor: "red" }, endPause);
				// ?? delay = endPause;
			}

			timer = setInterval(function(){
				var curTime = (new Date).getTime();

				if ( circle ) {
					updateCircle( count / rate, (totalTime - (curTime - startTime)) > endWarning );
				}

				if ( count >= rate ) {
					clearInterval( timer );
					update();
				}
				count++;
			}, totalTime / rate);

		} else {
			addPoints(false, letters[0], getPoint(letters[0]));
			
			multiplier = 1;
			doRemove = false;
			
			// Temporarily diabling the animation
			//$("#letters span:first").animate({ marginLeft: -100 }, 250, update);
			letters.shift();
			$("#letters span:first").remove();
			
			findWord();
			update();
		}
	}
	

	
	// Finding and extracting words
	var curFind;
	var foundWord = "";

	function extractWord() {
		if ( foundWord ) {
			// Extract the word
			letters.splice( 0, foundWord.length );
			$("#letters span").slice( 0, foundWord.length ).remove();
			
			// Split it up to calculate the score
			var l = foundWord.split(""), total = 0;

			for ( var i = 0; i < l.length; i++ ) {
				total += getPoint( l[i] );
			}

			// Add the points into the display
			addPoints( true, foundWord, Math.round(total) );

			// Increase the multiplier
			multiplier += 1 / (Math.floor(multiplier) * 10);

			// Reset the word
			foundWord = "";
		
		// No word found
		} else {
			multiplier = 1;
		}
	}
	
	
	
	// Ajax stuff
	var server = window.location.href.replace( /^(https?:..[^\/:]+).*/, "$1" ) + ":8338/";

	function findWord() {
		var spanLetters = $("#letters span"),
			word = letters.join("");

		if ( curFind ) {
			curFind.abort();
		}

		curFind = $.ajax({
			type: "GET",
			url: server,
			dataType: "jsonp",
			data: { word: word },
			cache: true,
			success: function(state){
				spanLetters.removeClass( "found" );
				foundWord = "";

				if ( state.pass && state.word.length > 2 ) {
					foundWord = state.word;
					spanLetters.slice( 0, state.word.length ).addClass( "found" );
				}

				curFind = null;
			}
		});
	}
	
	
	
	// Point calculation
	var multiplier = 1;
	var lengths = [ 0, 0, 1, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5 ];
	var points = 0;

	function getPoint(letter){
		return Math.round((data.total / data.letters[ letter ]) / 8.5);
	}

	function addPoints( state, word, total )  {
		var num = !state ?
			-1 * total :
			total * multiplier * lengths[word.length] * (letters.length === 0 ? 2 : 1);
		
		num = Math.round(num);
		points += num;

		$("<li>").addClass( state ? "pass" : "fail" ).html(
			"<b>" + (num >= 0 ? "+" : "" ) + num + ": " + word + ".</b> " + 
			( state ?
				total + " Points " +
				(lengths[word.length] > 1 ? "+" + lengths[word.length].toFixed(1) + "x Word Length. " : "") +
				(multiplier > 1 ? "+" + multiplier.toFixed(1) + "x Multiplier. " : "") +
				(letters.length === 0 ? "+2.0x Clean Slate. " : "") :
				word.length > 1 ?
					"Word not in dictionary." :
					"Letter not used." )
		).prependTo("#words");

		$("#points").text( points );
	}
	
	
	
	// Game letters
	var letters = [];
	var max = 9;
	var numLetters = 0;
	var maxLetters = 75;
	
	// Figuring out the next letter to drop
	var vowelCheck = /[aeiou]/, notVowelCheck = /[^aeiou]/;
	var purityControl = [];
	var possible = [];
	
	// Build a full array of all possible letters from which to pull
	for ( var i in data.letters ) {
		var num = data.letters[i];
		for ( var j = 0; j < num; j++ ) {
			possible.push( i );
		}
	}

	function addLetter( count ){
		count = count || 0;
		
		numLetters++;
		
		if ( numLetters <= maxLetters ) {
			var letter, isVowel,
				hasVowel = vowelCheck.test( purityControl ),
				hasConsonant = notVowelCheck.test( purityControl );

			// If the last letter dropped was a Q, make sure we drop a U next
			if ( purityControl[ 0 ] === "q" ) {
				letter = "u";
			
			// Otherwise attempt to drop a random letter
			} else {
				letter = possible[Math.round((random() * possible.length))];
			}
			
			// Are we currently dealing with a vowel?
			isVowel = vowelCheck.test(letter);

			if ( letter && (count > 20 ||
					// Make sure we don't drop duplicate letters
					purityControl[0] !== letter && (
						
						// Not enough letters in the queue yet, don't care about letter
						purityControl.length < 4 ||
					
						// No vowel has dropped recently and a vowel is dropping
						!hasVowel && isVowel ||
					
						// No consonant has dropped and one is dropping now
						!hasConsonant && !isVowel
					)
				)) {
				
				// Add the new letter onto the queue
				purityControl.unshift( letter );
				
				// Make sure the queue doesn't grow too long
				purityControl.splice( 4 );
				
				// Add the letter to the board
				letters.push( letter );

				// Inject new letter into the UI
				$("#letters").append( "<span>" + letter +
					// Disable animation in
					// (i === letters.length - 1 && numLetters <= maxLetters ? " class='last'" : "") +
					"<b>" + getPoint(letter) +
					" point" + (getPoint(letter) > 1 ? "s" : "") + "</b></span>" );
			
			// The letter didn't match the criteria so try again
			} else {
				numLetters--;
				return addLetter( count + 1 );
			}
		}

		// Let the user know how many 
		$("#tilesleft").text( maxLetters - numLetters > 0 ? maxLetters - numLetters : "No" );
	}
	
	
	
	// Updating circle canvas
	var drop = $("#drop")[0];
	var circle = drop.getContext ? drop.getContext("2d") : null;

	function resetCircle(){
		circle.strokeWidth = "0px";
		circle.fillStyle = "rgb(255,255,255)";
		circle.fillRect( 0, 0, 20, 20 );

		circle.fillStyle = "rgb(210,210,210)";
		circle.beginPath();
		circle.arc(10, 10, 9, 0, Math.PI * 2, true);
		circle.closePath();
		circle.fill();
	}

	function updateCircle(amount, rate){
		resetCircle();
		circle.fillStyle = rate ? "rgb(0,255,0)" : "rgb(255,0,0)";
		circle.beginPath();
		circle.moveTo(10, 10);
		circle.arc(10, 10, 9, -0.5 * Math.PI, (amount * (Math.PI * 2)) - (0.5 * Math.PI), false);
		circle.moveTo(10, 10);
		circle.closePath();
		circle.fill();
	}
	
	
	
	// Random generation
	var initSeed = Math.round(Math.random() * 1000);
	var numGames = 1000000;
	var seed = initSeed;

	// Check to see if we're playing a specific game #
	if ( location.search ) {
		seed = initSeed = parseInt(location.search.match(/\d+$/)[0]);
	}

	// Update the link to the game with the current #/seed
	$("#game").attr("href", "?game=" + initSeed).html( initSeed );

	function random(){
		// Robert Jenkins' 32 bit integer hash function.
		// JS implementation from V8 benchmark
		var seed = initSeed = initSeed + numGames;
		seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
		seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
		seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
		seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
		seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
		seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
		seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff; 
		return (seed & 0xfffffff) / 0x10000000;
	}
	
	

	function log(msg){
		if ( jQuery.browser.msie ) {
			jQuery("#words").append("<li>" + msg + "</li>");
		}
	}
	
	// Start the game
	update();
});
