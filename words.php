<?php
	$word = $_GET['word'];
	$first = substr( $word, 0, 1 );

	# $lines = array();
	$handle = fopen("words/" . $first . ".txt", "r");
	if ( $handle ) {
		while (!feof($handle)) {
			$line = trim(fgets($handle));
			if ( $line == $word ) {
				echo "pass";
				exit();
			}
		}
		fclose($handle);
	}

	echo "fail";
?>
