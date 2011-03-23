Deepleap!

Scrabble Dictionary Files:
 - http://ejohn.org/files/dict/ospd3.txt
 - http://ejohn.org/files/dict/ospd4.txt
 - http://ejohn.org/files/dict/owl.txt
 - http://ejohn.org/files/dict/owl2.txt
 - See also: http://mike.pietdepsi.com/scrabble/lexicons/

OpenOffice Dictionaries:
 - http://ftp.osuosl.org/pub/openoffice/contrib/dictionaries/
 - English: http://ftp.osuosl.org/pub/openoffice/contrib/dictionaries/en_US.zip
 - Post-process: dict/ooo/

Wiktionary:
 - http://dumps.wikimedia.org/enwiktionary/latest/enwiktionary-latest-pages-articles.xml.bz2
 - Post-process: dict/wiki/

TODO:
 - Write an automated, server-side, test suite for game.js
 - Write a QUnit-based test suite for ui.js
 - Automate dumping static stuff to CloudFront
 - Use SendGrid or Amazon Email for sending notifications
 - Store played games in a MySQL DB
 - Add a way for users to create an account (name / username - send them password)

App Structure:
 - Solo
   - Random Game / Replay Game
     - You can challenge a friend from here
     - Play a random game, dropping 75 tiles, go for medals
     - Some way to enter in game numbers and/or replay old games
   - Endurance
     - Tiles never stop coming, going for an overall point score (maybe tile count as well?)
   - Levels
     - Pre-compute scores via bot and figure out what scores are best
       - Possibly arrange levels by how "difficult" they are (what the high score is? or if there are any dropped letters?)
     - Put scores on a scale and award medals/trophies (bronze/silver/gold/diamond)
 - vs
   - Points
     - Playing the traditional 75 point game for high score
     - See the person/computer's board that your playing
   - Speed
     - Same as points but trying to complete it faster
   - Battle
     - Spelling a word removes the last letter for the other player
     - Makes it harder and harder to spell words
     - Not sure when the game should end (fixed amount of time? person can't spell a word?)
   - vs Friend
     - Connection done through NodeJS, requires net and persistence
   - vs Computer (Possibly require web workers?)
     - Easy, Medium, Hard, Expert
     - Possibly scale computation time based upon the level of difficulty
 - Rumble
   - Everyone connects to a central server
   - Everyone plays the same game simultaneously
   - Possibly have some bots playing as well to keep things interesting
   - Game is reset every couple minutes or so
   - Possibly allow people to "observe"?

Possible Designers:
 - http://www.lostgarden.com/2011/03/list-of-game-artists.html
   - http://blackmoondev.com/
   - http://www.bryneshrimp.com/
   - http://www.devilsgarage.com/
   - http://ryansumo.carbonmade.com/
   - http://www.israelcevans.com/
   - http://www.gabrielverdon.com/games/

Misc:
 - Find name: http://startupgods.com/
 - Testing: http://feedbackarmy.com/
 - Better Font: http://www.google.com/webfonts
 - Drop shadows: http://nicolasgallagher.com/css-drop-shadows-without-images/
 - Wood textures: http://tileabl.es/packs/pack-5-wood
 - Up and Running with Node.js: http://ofps.oreilly.com/titles/9781449398583/index.html
 - Mozilla Web Apps: https://apps.mozillalabs.com/
 - Background texture: http://rappdaniel.com/other/noisy-sample/