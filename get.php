<?php
//exit;
include("secret.php");

ini_set('user_agent','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7'); 
set_error_handler('handleError');
$debug=!isset($argv) || (count($argv)==2 && $argv[1]=="debug");
set_time_limit(90000);

$updatePeriod=14;
$baseurl="http://212.5.144.219";

$regmap=array();
$regmapList = file("mapping.csv");
for ($i=0;$i<count($regmapList); $i++) {
	$temp = explode(" ",$regmapList[$i]);
	$regmap[trim($temp[0])]=trim($temp[1]);
}
unset($regmapList);

$site=false;
$proxyList = file("proxy.csv");
$proxy=false;
$proxyi=0;
if (count($proxyList)==0) {
	echo "No proxy list";
	exit;	
}

for ($i=0;$i<count($proxyList); $i++) {
	try {
		$proxy=trim($proxyList[$i]);
		$proxyi=$i;
		$site = file_get_contents($baseurl."/pls/mhrb/f?p=365:112:0:", false, 
			stream_context_create(array('http'=>array(
			'proxy' => $proxy,
			'request_fulluri' => true,
			'timeout' => 30,
			'max_redirects' => 5
			))));

		if ($site && strpos($site,"Mag Studio")===false)
			break;
	} catch (ErrorException $e) {
	   $site==false;
	}
	if ($debug)
		echo "skip proxy $proxy\n";
}

if (!$site) {
	echo "Could not get initial session";
	exit;	
}
if ($proxyi>0) {
	$proxyListNew=array_slice($proxyList,$proxyi);
	file_put_contents("proxy.csv",implode("",$proxyListNew));
	unset($proxyListNew);
}
if ($debug)
	echo "Using proxy $proxy. Proxy list ".count($proxyList)."\n";
unset($proxyList);


preg_match_all("_<input type=\"hidden\".*?name=\"(.*?)\".*?value=\"(.*?)\"_im", $site,$matches);
$pVals = array();
for ($i=0;$i<count($matches[1]);$i++)
	$pVals[$matches[1][$i]]=$matches[2][$i];

unset($site);
unset($matches);
if ($debug) {
	print_r($pVals);
}


$data = array();
$data[0] = "Име,Сигнатура";
for ($j=0;$j<$updatePeriod;$j++) {
	set_time_limit(90000);
	$date = date("d.m.Y",time()-$j*3600*24);
	if ($date=="28.10.2011")
		break;
	if ($debug)
		echo "$date \n";

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
		stream_context_create(array('http'=>array(
			'method'=>'GET',
			'header'=>"Cookie: "."WWV_PUBLIC_SESSION_365=".$pVals["p_instance"]."\r\nConnection: keep-alive\r\nCache-Control: max-age=0"
		))));
	preg_match_all("_<point\s+name=\"(.+?)\"\sy=\"(.*?)\".*?CDATA\[(.*?)\]_im", $one,$matches);


	if (count($matches)!=4) {
		echo "Error loading birth data";
		exit;	
	}

	$data[0].=",$date";
	for ($i=0;$i<count($matches[1]);$i++) 
		if (!isset($data[$i+1]))
			$data[$i+1]=$matches[3][$i].",".$regmap[$matches[1][$i]].",".$matches[2][$i];
		else
			$data[$i+1].=",".$matches[2][$i];
	unset($one);
	unset($matches);
}

if (count($data)<2) {
	echo "Error loading birth data";
	exit;	
}

$dataOld = gzfile("rajdaemost.csv.gz");
$date = date("d.m.Y",time()-$updatePeriod*3600*24);
$headerOld=explode(",",$dataOld[0]);
$posOld = 0;
for ($i=0;$i<count($headerOld);$i++)
	if ($date==$headerOld[$i]) {
		$posOld=$i;
		break;
	}

for ($i=0;$i<count($dataOld);$i++) {
	$row=array_slice(explode(",",trim($dataOld[$i])),$posOld);
	$data[$i].=",".implode(",",$row);	
}

copy("rajdaemost.csv.gz","rajdaemost".date("YmdHis").".csv.gz");
$fgz = fopen ( "rajdaemost.csv.gz", 'w' );
fwrite ( $fgz , gzencode ( implode("\n",$data) , 9 ) );
fclose ( $fgz  );

if ($debug)
	echo "ok";

function http_post($url, $data, $cookies)
{
	global $proxy;
	if (is_array($data))
		$data_url = http_build_query($data);
	else
		$data_url = $data;
	$data_len = strlen($data_url);
	return file_get_contents ($url, false, stream_context_create (array ('http'=>array(
			'method'=>'POST',
			'header'=>"Content-Length: $data_len\r\n".
				    "Content-type: application/x-www-form-urlencoded\r\n".
				    "Cookie: $cookies\r\n".
				    "Connection: keep-alive\r\n".
				    "Cache-Control: max-age=0",
			'proxy' => $proxy,
	        	'request_fulluri' => true,
			'timeout' => 5,
			'max_redirects' => 5
		, 'content'=>$data_url
		))));
}

function handleError($errno, $errstr, $errfile, $errline, array $errcontext)
{
    if (0 === error_reporting()) {
        return false;
    }

    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
}

?>
