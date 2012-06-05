
<?php
$link = mysql_connect('localhost', 'user', 'pass');
if (!$link) {
    die('Could not connect: ' . mysql_error());
}
mysql_select_db("database");
mysql_set_charset("utf8");

$sql ="select * from birth";
$resAll = mysql_query($sql);
if (!$resAll)
	die('Error reading DB: '. mysql_error());
while ($r=mysql_fetch_assoc($resAll)) $res[]=$r;

$newdata = gzfile("rajdaemost.csv.gz");
$upload = array();
$dirty=false;

$dataisok=isset($_GET["origdata"]);

for ($i=0;$i<count($newdata);$i++) {
	$newdata[$i]=explode(",",trim($newdata[$i]));
	if ($i==0)
		continue;

	for ($j=2;$j<count($newdata[$i]);$j++) {
		$date = toDate($newdata[0][$j]);
		foreach ($res as $r) {
			if ($r["date"]==$date && $r["region"]==$newdata[$i][1]){
				if ($dataisok || $r["births"]<intval($newdata[$i][$j]))
					$upload[]=array($date, $newdata[$i][1], intval($newdata[$i][$j]));
				else
				if ($r["births"]>intval($newdata[$i][$j])) {
					$newdata[$i][$j]=$r["births"];
					$dirty=true;
				}
				continue 2;				
			} 
		}
		if (intval($newdata[$i][$j])>0)
			$upload[]=array($date, $newdata[$i][1], intval($newdata[$i][$j]));
	}
}

for ($i=0;$i<count($upload);$i+=50) {
	$query=array();
	for ($j=$i;$j<($i+50<count($upload)?$i+50:count($upload));$j++)
		$query[]="(\"".$upload[$j][0]."\",\"".$upload[$j][1]."\",".$upload[$j][2].")";
	$query="replace into birth (date,region,births) values ".implode(",",$query);
	mysql_query($query) or die("Error while replacing");
	echo ". ";

}
echo "updated ".count($upload).". ";

if ($dirty) {
	for ($i=0;$i<count($newdata);$i++)
		$newdata[$i]=implode(",",$newdata[$i]);
	$newdata=implode("\n",$newdata);
	echo "Updated file\n";
	copy("rajdaemost.csv.gz","rajdaemost".date("YmdHis").".csv.gz");
	$fgz = fopen ( "rajdaemost.csv.gz", 'w' );
	fwrite ( $fgz , gzencode ( $newdata , 9 ) );
	fclose ( $fgz  );
}



mysql_close($link);

function toDate($date) {
	return substr($date,6,4)."-".substr($date,3,2)."-".substr($date,0,2);
}

?>
