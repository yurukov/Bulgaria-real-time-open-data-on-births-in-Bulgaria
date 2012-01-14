<?php
ini_set('user_agent','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7'); 

$baseurl="http://212.5.144.219";
$site = file_get_contents($baseurl."/pls/mhrb/f?p=365:112:0:");

$regmap=array();
$regmap['BLG']='BG-01';
$regmap['BGS']='BG-02';
$regmap['VAR']='BG-03';
$regmap['VTR']='BG-04';
$regmap['VID']='BG-05';
$regmap['VRC']='BG-06';
$regmap['GAB']='BG-07';
$regmap['DOB']='BG-08';
$regmap['KRZ']='BG-09';
$regmap['KNL']='BG-10';
$regmap['LOV']='BG-11';
$regmap['MON']='BG-12';
$regmap['PAZ']='BG-13';
$regmap['PER']='BG-14';
$regmap['PVN']='BG-15';
$regmap['PDV']='BG-16';
$regmap['RAZ']='BG-17';
$regmap['RSE']='BG-18';
$regmap['SLS']='BG-19';
$regmap['SLV']='BG-20';
$regmap['SML']='BG-21';
$regmap['SFO']='BG-23';
$regmap['SOF']='BG-22';
$regmap['SZR']='BG-24';
$regmap['TGV']='BG-25';
$regmap['HKV']='BG-26';
$regmap['SHU']='BG-27';
$regmap['JAM']='BG-28';

preg_match_all("_<input type=\"hidden\".*?name=\"(.*?)\".*?value=\"(.*?)\"_im", $site,$matches);
$pVals = array();
for ($i=0;$i<count($matches[1]);$i++)
	$pVals[$matches[1][$i]]=$matches[2][$i];

unset($site);
unset($matches);

$data = array();
$header = "Име,Сигнатура";
for ($j=0;$j<1000;$j++) {
	set_time_limit(90000);
	$date = date("d.m.Y",time()-$j*3600*24);
	if ($date=="28.10.2011")
		break;
	if (isset($_GET["v"]))
		echo "$date ";

	$args = array(
	"p_flow_id=".$pVals["p_flow_id"],
	"p_flow_step_id=".$pVals["p_flow_step_id"],
	"p_instance=".$pVals["p_instance"],
	"p_page_submission_id=".$pVals["p_page_submission_id"],
	"p_request=Go",
	"p_arg_names=1400110654449976",
	"p_t01=".$date,
	"p_arg_names=1400311885449978",
	"p_t02=".$date,
	"p_md5_checksum="
	);

	$one= http_post("$baseurl/pls/mhrb/wwv_flow.accept", implode("&",$args), "WWV_PUBLIC_SESSION_365=".$pVals["p_instance"]);
	unset($one);
	$one=file_get_contents($baseurl."/pls/mhrb/apex_util.flash?p=365:112:".$pVals["p_instance"].":FLOW_FLASH_CHART5_R1399822002449976_bg", false, 
		stream_context_create(array('http'=>array('method'=>'GET'
		, 'header'=>"Cookie: "."WWV_PUBLIC_SESSION_365=".$pVals["p_instance"]."\r\nConnection: keep-alive\r\nCache-Control: max-age=0"
		))));

/*
	$one=file_get_contents($baseurl."/pls/mhrb/f?p=365:112:".$pVals["p_instance"].":::::", false, stream_context_create(array('http'=>array('method'=>'GET'
		, 'header'=>"Cookie: "."WWV_PUBLIC_SESSION_365=".$pVals["p_instance"]."\r\nConnection: keep-alive\r\nCache-Control: max-age=0"
		))));

	preg_match_all("_<input type=\"hidden\".*?name=\"(.*?)\".*?value=\"(.*?)\"_im", $one,$matches);
	if (count($matches)!=3)
		continue;
	$pVals = array();
	for ($i=0;$i<count($matches[1]);$i++)
		$pVals[$matches[1][$i]]=$matches[2][$i];

	unset($one);
	unset($matches);

	preg_match_all("_<point\s+name=\"(.+?)\"\sy=\"(.*?)\".*?CDATA\[(.*?)\]_im", html_entity_decode($pVals["p_t02"]),$matches);
*/

	preg_match_all("_<point\s+name=\"(.+?)\"\sy=\"(.*?)\".*?CDATA\[(.*?)\]_im", $one,$matches);

	if (count($matches)!=4) {
		echo "Error loading birth data";
		exit;	
	}

	$header.=",$date";
	for ($i=0;$i<count($matches[1]);$i++) 
		if (!isset($data[$i]))
			$data[$i]=$matches[3][$i].",".$regmap[$matches[1][$i]].",".$matches[2][$i];
		else
			$data[$i].=",".$matches[2][$i];
	unset($one);
	unset($matches);
}
copy("rajdaemost.csv.gz","rajdaemost".date("YmdHis").".csv.gz");

$fgz = fopen ( "rajdaemost.csv.gz", 'w' );
fwrite ( $fgz , gzencode ( $header."\n".implode("\n",$data) , 9 ) );
fclose ( $fgz  );

function http_post($url, $data, $cookies)
{
	if (is_array($data))
		$data_url = http_build_query($data);
	else
		$data_url = $data;
	$data_len = strlen($data_url);
	return file_get_contents ($url, false, stream_context_create (array ('http'=>array ('method'=>'POST'
		, 'header'=>"Content-Length: $data_len\r\n".
			    "Content-type: application/x-www-form-urlencoded\r\n".
			    "Cookie: $cookies\r\n".
			    "Connection: keep-alive\r\n".
			    "Cache-Control: max-age=0"
		, 'content'=>$data_url
		))));
}

?>
