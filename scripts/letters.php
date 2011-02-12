<?php
	$letters = "";

	# $lines = array();
	$handle = fopen("ospd3.txt", "r");
	while (!feof($handle)) {
		$letters .= trim(fgets($handle));
	}
	fclose($handle);

	$letters = str_split($letters);
	#sort($letters);

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
		#for ( $j = 0; $j < $num; $j++ ) {
			#echo $i;
		#}
	}
	echo "],total:" . $pre . "}";


	#$letters = implode("", $letters);

	#print_r($nums);

	#echo $letters;

?>
