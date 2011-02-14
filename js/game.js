$(function(){
	// Letter data
	// Distribution of OSPD4 + OpenOffice en_US + Wiktionary English
	var data = {letters:{a:77,d:38,h:23,e:111,i:75,n:58,g:27,s:85,k:13,l:53,m:27,b:21,o:61,r:68,v:9,w:10,f:14,t:57,z:4,c:36,u:34,p:28,y:17,j:2,x:3,q:2},total:953};
	//  A 1 B 5 C 3 D 3 E 1 F 8 G 4 H 5 I 1 J 56 K 9 L 2 M 4 N 2 O 2 P 4 Q NaN R 2 S 1 T 2 U 3 V 12 W 11 X 37 Y 7 Z 28

	// Distribution of OSPD4 + OpenOffice en_US (first letter only)
	// var data = {letters:{a:7,b:8,c:10,d:6,e:4,f:5,g:4,h:4,i:3,j:1,k:2,l:4,m:6,n:2,o:4,p:9,r:7,s:14,t:6,u:3,v:2,w:3,y:1,z:1,x:1},total:117};
	//  A 2 B 2 C 1 D 2 E 3 F 3 G 3 H 3 I 5 J 14 K 7 L 3 M 2 N 7 O 3 P 2 Q NaN R 2 S 1 T 2 U 5 V 7 W 5 X 14 Y 14 Z 14
	// Add back in q:1

	// Distribution of OSPD4 + OpenOffice en_US
	// var data = {letters:{a:68,h:21,e:101,d:35,i:67,n:52,g:25,s:80,l:48,r:62,v:8,k:11,w:9,o:53,f:13,b:19,c:32,u:30,t:51,m:24,p:25,y:15,x:3,j:2,z:4},total:860};
	//  A 1 B 5 C 3 D 3 E 1 F 8 G 4 H 5 I 2 J 51 K 9 L 2 M 4 N 2 O 2 P 4 Q NaN R 2 S 1 T 2 U 3 V 13 W 11 X 34 Y 7 Z 25
	// Add back in: q:2

	// Distribution of OSPD3
	// var data = {letters:{a:45,b:13,d:23,e:65,g:16,h:14,i:42,l:31,m:16,n:32,r:40,s:52,t:32,w:7,x:2,y:10,o:34,f:8,j:1,k:8,u:20,p:16,c:20,z:2,v:5},total:555};
	//  A 1 B 5 C 3 D 3 E 1 F 8 G 4 H 5 I 2 J 65 K 8 L 2 M 4 N 2 O 2 P 4 Q NaN R 2 S 1 T 2 U 3 V 13 W 9 X 33 Y 7 Z 33
	// Add back in: q:1

	var vowelCheck = /[aeiou]/, notVowel = /[^aeiou]/;
	var purityControl = "";
	var possible = [];

	// Point calculation
	var multiplier = 1;
	var lengths = [ 0, 0, 1, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5 ];
	var points = 0;

	// Timer control
	var doRemove = false;
	var timer;
	var endPause = 5000;

	// Game letters
	var letters = [];
	var max = 9;
	var numLetters = 0;
	var maxLetters = 75;

	// Ajax stuff
	var server = window.location.href.replace( /^(https?:..[^\/:]+).*/, "$1" ) + ":8338/";

	// Random generation
	var initSeed = Math.round(Math.random() * 1000);
	var numGames = 1000000;
	var seed = initSeed;

	if ( location.search ) {
		seed = initSeed = parseInt(location.search.match(/\d+$/)[0]);
	}

	$("#game").attr("href", "?game=" + initSeed).html( initSeed );

	var drop = $("#drop")[0];
	var circle = drop.getContext ? drop.getContext("2d") : null;

	for ( var i in data.letters ) {
		var num = data.letters[i];
		for ( var j = 0; j < num; j++ ) {
			possible.push( i );
		}
	}

	for ( var i = 0; i < 3; i++ ) {
		addLetter();
	}

	$("#letters").sortable({
		stop: function(){
			letters = $("#letters span").map(function(){ return this.firstChild.nodeValue; }).get();
			findWord();
		}
	});

	function update(){
		if ( letters.length === 0 && numLetters > maxLetters ) {
			alert("Game Over!");
			return;
		}

		if ( doRemove && foundWord ) {
			if ( curFind ) {
				// Trigger on find done
			} else {
				saveWord(
					foundWord,
					$("<li>Calculating score for <strong>" + foundWord + "</strong>.</li>").prependTo("#words"),
					letters.length
				);

				doRemove = false;
				letters.splice( 0, foundWord.length );
				$("#letters span").slice( 0, foundWord.length ).remove();
				foundWord = "";

				update();
			}

		} else if ( !doRemove ) {
			addLetter();
			//updateLetters();
			updateMultiplier();

			var delay = endPause / 2;
			var count = 0, rate = 20;

			if ( letters.length >= max || numLetters > maxLetters ) {
				// Disabled for now.
				//if ( !vowelCheck.test(letters.join("")) )
					//endPause = 100;

				doRemove = true;
				// Temporarily disable the red background fade
				//$("#letters span:first").animate({ backgroundColor: "red" }, endPause);
				delay = endPause;
			}

			timer = setInterval(function(){
				if ( circle ) {
					updateCircle( count / rate, delay !== endPause );
				}

				if ( count >= rate ) {
					clearInterval( timer );
					update();
				}
				count++;
			}, delay / rate);

		} else {
			var li = $("<li></li>").prependTo("#words");
			addPoints(false, letters[0], getPoint(letters[0]), letters.length, li);
			letters.shift();
			multiplier = 1;
			doRemove = false;
			
			// Temporarily diabling the animation
			//$("#letters span:first").animate({ marginLeft: -100 }, 250, update);
			$("#letters span:first").remove();
			update();
		}

		findWord();
	}

	update();

/*
	$("form").submit(function(){
		var word = $("#word").val().toLowerCase(),
			l = word.split(""), spanLetters = $("#letters span");

		if ( word.length < 2 ) {
			return false;
		}

		if ( RegExp(word.split("").sort().join(".*")).test( letters.slice().sort().join("") ) ) {
			clearTimeout( timer );
			doRemove = false;

			$("#word").val("").focus();

			for ( var i = 0; i < l.length; i++ ) {
				for ( var j = 0; j < letters.length; j++ ) {
					if ( letters[j] === l[i] ) {
						letters[j] = null;
						spanLetters.eq(j).stop().animate({ marginLeft: -100, marginRight: 0, opacity: "hide" }, 250);
						break;
					}
				}
			}

			var tmp = [];
			for ( var i = 0; i < letters.length; i++ ) {
				if ( letters[i] ) {
					tmp.push( letters[i] );
				}
			}
			letters = tmp;

			saveWord(
				word,
				$("<li>Checking <strong>" + word + "</strong>.</li>").prependTo("#words"),
				letters.length
			);

			setTimeout( update, 300 );
		}

		return false;
	});
*/

	var curFind, foundWord = "";

	function findWord() {
		var spanLetters = $("#letters span"),
			word = spanLetters.map(function(){ return this.firstChild.nodeValue; }).get().join("");

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

	function saveWord(word, li, left){
		$.ajax({
			type: "GET",
			url: server,
			dataType: "jsonp",
			data: { word: word },
			cache: true,
			error: function(){
				setTimeout(function(){
					saveWord(word, li, left);
				}, 1000);
			},
			success: function(state){
				var l = word.split(""), total = 0;

				if ( state.pass ) {
					multiplier = 1;
				}

				for ( var i = 0; i < l.length; i++ ) {
					total += getPoint( l[i] );
				}

				addPoints( state.pass, word, Math.round(total), left, li );

				if ( state.pass ) {
					multiplier += 1 / (Math.floor(multiplier) * 10);
				}

				updateMultiplier();
			}
		});
	}

	function getPoint(letter){
		return Math.round((data.total / data.letters[ letter ]) / 8.5);
	}

	window.key = function(){
		var str = "";
		for ( var i = 65; i < 65 + 26; i++ ) {
			str += " " + String.fromCharCode(i) + " " + getPoint( String.fromCharCode(i).toLowerCase() );
		}
		return str;
	};

	window.dump = function(){
		for ( var i = numLetters; i < maxLetters; i++ ) {
			addLetter();
		}
		return letters.join("");
	};

	function addPoints(state, word, total, left, li){
		var num = !state ? -1 * total : total * multiplier * lengths[word.length] * (left === 0 ? 2 : 1);
		num = Math.round(num);
		points += num;

		li.addClass( state ? "pass" : "fail" ).html(
			"<b>" + (num >= 0 ? "+" : "" ) + num + ": " + word + ".</b> " + 
			( state ?
				total + " Points " +
				(lengths[word.length] > 1 ? "+" + lengths[word.length].toFixed(1) + "x Word Length. " : "") +
				(multiplier > 1 ? "+" + multiplier.toFixed(1) + "x Multiplier. " : "") +
				(left === 0 ? "+2.0x Clean Slate. " : "") :
				word.length > 1 ?
					"Word not in dictionary." :
					"Letter not used." )
		);

		$("#points").html( points );
	}

	function addLetter(){
		numLetters++;
		if ( numLetters <= maxLetters ) {
			var letter;

			if ( purityControl.length && purityControl[ purityControl.length - 1 ] === "q" ) {
				letter = "u";
			} else {
				letter = possible[Math.round((random() * possible.length))];
			}

			if ( letter && (purityControl.length < 4 ||
					(!vowelCheck.test(purityControl) && vowelCheck.test(letter)) ||
					(!notVowel.test(purityControl) && notVowel.test(letter)) || 
					(vowelCheck.test(purityControl) && notVowel.test(purityControl))) &&
					(purityControl.length < 1 ||
						purityControl[purityControl.length - 1] !== letter) ) {
				letters.push( letter );
				purityControl += letter;
				if ( purityControl.length > 4 ) {
					purityControl = purityControl.slice(1);
				}

				$("#letters").append( "<span>" + letter +
					// Disable animation in
					// (i === letters.length - 1 && numLetters <= maxLetters ? " class='last'" : "") +
					"<b>" + getPoint(letter) +
					" point" + (getPoint(letter) > 1 ? "s" : "") + "</b></span>" );
			} else {
				numLetters--;
				return addLetter();
			}
		}

		var left = maxLetters - numLetters;
		$("#tilesleft").text( left > 0 ? left : "No" );
	}

	function updateMultiplier(){
		// $("#multiplier").html( multiplier.toFixed(1) );
	}

	function updateLetters(){
		var html = jQuery.map(letters, function(l,i){
			return "<span" + 
				// Disable animation in
				// (i === letters.length - 1 && numLetters <= maxLetters ? " class='last'" : "") +
				">" + l +
				"<b>" + getPoint(l) + " point" + (getPoint(l) > 1 ? "s" : "") + "</b></span>"; }).join(" ");

		$("#letters").html( html );

		if ( numLetters <= maxLetters ) {
			// Disable animation in
			// $("#letters span.last").animate({ top: 0 }, 250);
		}
	}

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
});
