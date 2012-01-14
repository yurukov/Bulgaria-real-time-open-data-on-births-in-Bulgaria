birthData=false;
censusData=false;
header=false;
censusHeader=false;
geochart=false;
colchart=false;
chartblock=false;
chartdata=false;
colchartregion=false;

google.load('visualization', '1', {packages: ['geochart','corechart']});
google.setOnLoadCallback(loadData);

function loadData() {
	$("#dataCalc1").attr("checked",true);
	$("#periodCalc1").attr("checked",true);
	$("input[type='radio']").change(function() {
		draw();
	});
	$("input[name='dataCalc']").change(function() {
		$("#age-selector").slideToggle();
	});
	$("#dataCalc").buttonset();
	$("#periodCalc").buttonset();

	$.ajax({
		url: "rajdaemost.csv?"+Math.floor(Math.random()*10000),
		success: function(data) {
			data=data.replace(/(^\s*)|(\s*$)/g, "").split("\n");
			birthData=new Array();
			header=data[0].split(",").slice(2).reverse();
			for (var i=1;i<data.length;i++) {
				raw=data[i].split(",");
				rawN = raw.slice(2).reverse();
				for (var j=0;j<rawN.length;j++)
					rawN[j]=parseInt(rawN[j]);
				birthData[birthData.length]=[{v:raw[1], f:raw[0]}, rawN];
			}
			init();
		},
		error:function(jqXHR, textStatus, errorThrown) {
			$("#visualizationMap").append("<div style=\"text-align:center; color:red;\">Грешка при зареждане на данните за раждаемостта:<br/>"+textStatus+": "+errorThrown+"</div>");
		}
	});
	$.ajax({
		url: "naselenie.csv",
		success: function(data) {
			data=data.replace(/(^\s*)|(\s*$)/g, "").split("\n");
			censusData=new Array();
			censusHeader=data[0].split(",").slice(1);
			censusData[0]=new Array();
			for (var i=1;i<data.length;i++) {
				raw=data[i].split(",");
				for (var j=1;j<raw.length;j++)
					raw[j]=parseInt(raw[j]);
				censusData[censusData.length]=raw;
			}
			init();
		},
		error:function(jqXHR, textStatus, errorThrown) {
			$("#visualizationMap").append("<div style=\"text-align:center; color:red;\">Грешка при зареждане на данните за населението:<br/>"+textStatus+": "+errorThrown+"</div>");
		}
	});
}

function init() {
	if (!birthData || !censusData)
		return;
	startSlider();
	startCensusSlider();
	drawChart();
}

function drawChart(region) {
	colchartregion=region;

	var begin = displacement($("#slider-range").slider("values",0));
	var end = displacement($("#slider-range").slider("values",1));

	var regionName=false;
	var tempData = new Array();
	for (var i=0;i<birthData.length;i++) {
		if (!region || region.region==birthData[i][0].v) {
			for (var j=begin;j<=end;j++) {
				if (!tempData[j-begin])
					tempData[j-begin]=[ {v:header[j], f:header[j].substring(0,5) }, birthData[i][1][j] ];
				else
					tempData[j-begin][1]+=birthData[i][1][j];
			}
			if (region) {
				regionName = birthData[i][0].f;
				break;
			}
		}
	}

	$("#colchart-text").text(regionName ? " за "+regionName : "");
	var data = new google.visualization.DataTable();
	data.addColumn('string', 'Дата');
	data.addColumn('number', 'Раждания'+(regionName ? " в "+regionName : ""));
	data.addRows(tempData);


	if (colchart==false)
		colchart = new google.visualization.ColumnChart(document.getElementById('visualizationChart'));
	colchart.draw(data,{width:700,height:300,colors:['green'],legend: {position: "none"},animation:{'duration':1000}, chartArea:{left:30,top:10,width:670,height:240}, vAxis:{minValue:0}});
}

function drawVisualization(begin, end) {
	var data = new google.visualization.DataTable();
	data.addColumn('string', 'Регион');
	if ($("#dataCalc2:checked").val()) {
		var fromv = $("#slider-census-range").slider("values",0);
		var tov = $("#slider-census-range").slider("values",1);
		var from = fromv==18 ? "" : "между "+censusHeader[fromv-1].split("-")[0]+" и ";
		var to = tov==18 ? censusHeader[tov-1] : censusHeader[tov-1].split("-")[1];
		var title = 'На 10000 души на '+from+to+' г.';
		if ($("#periodCalc2:checked").val())	
			title+=' за месец'
		data.addColumn('number', title);
	}
	else
		data.addColumn('number', 'Общо раждания');

	var tempData = new Array();
	for (var i=0;i<birthData.length;i++) {
		var count=0;
		for (var j=begin;j<=end;j++)
			count+=birthData[i][1][j];

		if ($("#dataCalc2:checked").val()) {
			count=count/getCensusCount(birthData[i][0].v)*1000000;
			if ($("#periodCalc2:checked").val())
				count=count/(end-begin+1)*30.5;
			count=Math.round(count)/100;
		}
		tempData[i]=[ birthData[i][0], count ];
	}
	data.addRows(tempData);	

	chartblock=true;
	geochart.draw(data, {width: 700, height: 436, region:"BG", resolution:"provinces"});
}

function drawIfReady() {
	if (chartblock.begin)
		drawVisualization(chartblock.begin, chartblock.end);
	else
		chartblock=false;
}


function draw(begin, end) {
	if (geochart==false) {
		geochart = new google.visualization.GeoChart(document.getElementById('visualizationMap'));
		google.visualization.events.addListener(geochart, 'regionClick', drawChart);
		google.visualization.events.addListener(geochart, 'ready', drawIfReady);
	}

	if (begin==undefined || end==undefined) {
		begin=chartdata.begin;
		end=chartdata.end;
	} else
	if (chartdata.begin==begin && chartdata.end==end)
		return;
	else
		chartdata={"begin":begin, "end":end};

	if (chartblock==false)
		drawVisualization(begin, end);
	else 
		chartblock={"begin":begin, "end":end};
}


function startSlider(){
	$( "#slider-range" ).slider({
		range: true,
		min: 0,
		max: 700,
		values: [ redisplacement(header.length-15) , redisplacement(header.length-1) ],
		slide: function( event, ui ) {
			$( "#date-amount" ).text( header[displacement(ui.values[0])] + " до " + header[displacement(ui.values[1])] );
			if (header[displacement(ui.values[0])].split(".")[2]==2011)
				$( "#date-warning" ).text("(Данните от 2011-та са непълни)");
			else
			if ($( "#date-warning" ).text()!="")
				$( "#date-warning" ).text("");

			draw( displacement(ui.values[0]), displacement(ui.values[1]) );
		},
		change: function( event, ui ) {
			drawChart(colchartregion);
		}
	});
	$( "#date-amount" ).text( header[header.length-15] + " - " + header[header.length-1] );
	draw(header.length-15 , header.length-1);
}

function displacement(val) {
	return Math.ceil((header.length-1)*Math.sin(val/700*Math.PI/2));
}

function redisplacement(val) {
	return Math.ceil(700*Math.asin(val/(header.length-1))/Math.PI*2);
}

function startCensusSlider(){
	$( "#slider-census-range" ).slider({
		range: true,
		min: 1,
		max: 18,
		values: [ 5 , 12 ],
		slide: function( event, ui ) {
			var from=ui.values[0]==18 ? "" : censusHeader[ui.values[0]-1].split("-")[0]+" до ";
			var to=ui.values[1]==18 ? censusHeader[ui.values[1]-1] : censusHeader[ui.values[1]-1].split("-")[1];
			$( "#span-age" ).text( from+to );
			updateCensusCount(ui.values[0],ui.values[1]);
			draw();
		}
	});
	$( "#span-age" ).text(censusHeader[4].split("-")[0]+" до "+censusHeader[11].split("-")[1]);
	updateCensusCount(5,12);
}
function updateCensusCount(from,to) {
	for (var j=1;j<censusData.length;j++) {
		censusData[0][j-1]=[censusData[j][0],0];
		for (var i=from;i<=to;i++) 
			censusData[0][j-1][1]+=censusData[j][i];
	}
}

function getCensusCount(region) {
	for (var i=0;i<censusData[0].length;i++)
		if (censusData[0][i][0]==region)
			return censusData[0][i][1];
	return 1;
}

