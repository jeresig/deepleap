<?php
	$letters = "";

	$handle = fopen("dict.txt", "r");
	while (!feof($handle)) {
		$letters .= trim(fgets($handle));
	}
	fclose($handle);

	$letters = str_split($letters);

	$nums = array();

	foreach ($letters as $i => $value) {
		$nums[$value]++;
	}

	echo "{letters:[";

	$pre = 0;

	foreach ($nums as $i => $value) {
		$num = round($nums[$i] / 979);
		if ( $pre > 0 ) {
			echo ",";
		}
		$pre += $num;
		echo $i . ":" . $num;
	}
	echo "],total:" . $pre . "}";
?>
