birthData=false;
censusData=false;
birth10Data=false;
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
	$("input[type='radio']").change(function() {
		draw();
	});
	$("input[name='dataCalc']").change(function() {
		var sliderNewPos="0px";
		if ($("#dataCalc2:checked").val() ) {
			sliderNewPos="-700px";
			
			if ($("#age-selector").css("display")=="none")
				$("#age-selector").slideDown();
		} else {
			if ($("#age-selector").css("display")!="none")
				$("#age-selector").slideUp();
			if ($("#dataCalc3:checked").val()) 
				sliderNewPos="-1400px";
		}
		$("#info-box-slider").animate({left:sliderNewPos},1000);
	});
	$("#dataCalc").buttonset();

	$.ajax({
		url: "/birth/rajdaemost.csv?"+Math.floor(Math.random()*10000),
		success: function(data) {
			data=data.replace(/(^\s*)|(\s*$)/g, "").split("\n");
			birthData=new Array();
			header=data[0].split(",").slice(2).reverse();
			for (var i=1;i<data.length;i++) {
				raw=data[i].split(",");
				rawN = raw.slice(2).reverse();
				for (var j=0;j<rawN.length;j++)
					rawN[j]=parseInt(rawN[j]);
				if (l.cities)
					raw[0]=l.cities[i-1];
				birthData[birthData.length]=[{v:raw[1], f:raw[0]}, rawN];
			}
			init();
		},
		error:function(jqXHR, textStatus, errorThrown) {
			$("#visualizationMap").append("<div style=\"text-align:center; color:red;\">"+l.errorloading+"<br/>"+textStatus+": "+errorThrown+"</div>");
		}
	});
	$.ajax({
		url: "/birth/naselenie.csv",
		success: function(data) {
			data=data.replace(/(^\s*)|(\s*$)/g, "").split("\n");
			censusData=new Array();
			censusHeader=data[0].split(",").slice(1);
			censusData[0]=new Array();

			birth10Data=new Array();
			birth10Data[0]=new Array();
			birth10Data[1]=new Array();

			for (var i=1;i<data.length;i++) {
				raw=data[i].split(",");

				birth10Data[0][i-1]=raw[0];
				birth10Data[1][i-1]=parseInt(raw[raw.length-1]);
				raw=raw.slice(0,raw.length-1);

				for (var j=1;j<raw.length;j++)
					raw[j]=parseInt(raw[j]);
				censusData[censusData.length]=raw;
			}
			init();
		},
		error:function(jqXHR, textStatus, errorThrown) {
			$("#visualizationMap").append("<div style=\"text-align:center; color:red;\">"+l.errorloading1+"<br/>"+textStatus+": "+errorThrown+"</div>");
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
	if (region && region.region.substring(0,2)!="BG")
		region=false;
	colchartregion=region;

	var begin = $("#slider-range").slider("values",0);
	var end = $("#slider-range").slider("values",1);

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

	$("#colchart-text").text(regionName ? l.in_+" "+regionName : l.for_country);
	var data = new google.visualization.DataTable();
	data.addColumn('string', l.date);
	data.addColumn('number', l.births+(regionName ? " "+l.in_+" "+regionName : ""));
	data.addRows(tempData);


	if (colchart==false)
		colchart = new google.visualization.ColumnChart(document.getElementById('visualizationChart'));
	colchart.draw(data,{width:700,height:300,colors:['green'],legend: {position: "none"},animation:{'duration':1000}, chartArea:{left:30,top:10,width:670,height:240}, vAxis:{minValue:0}});
}

function drawVisualization(begin, end) {
	var data = new google.visualization.DataTable();
	data.addColumn('string', l.region);
	if ($("#dataCalc2:checked").val()) {
		var fromv = $("#slider-census-range").slider("values",0);
		var tov = $("#slider-census-range").slider("values",1);
		var from = fromv==18 ? l.to_+" " : l.between_+" "+censusHeader[fromv-1].split("-")[0]+" "+l.and_+" ";
		var to = tov==18 ? censusHeader[tov-1] : censusHeader[tov-1].split("-")[1];
		data.addColumn('number', l.to1000people+' '+from+to+' '+l.years);
	} else
	if ($("#dataCalc3:checked").val()) {
		data.addColumn('number', l.change10);
	}
	else
		data.addColumn('number', l.allbirths);

	var tempData = new Array();
	var maxB = 0;
	for (var i=0;i<birthData.length;i++) {
		var count=0;
		for (var j=begin;j<=end;j++)
			count+=birthData[i][1][j];

		if ($("#dataCalc2:checked").val()) {
			count=count/getCensusCount(birthData[i][0].v)*1000000;
			count=Math.round(count)/100;
			tempData[i]=[ birthData[i][0],  {v:count} ];
		} else
		if ($("#dataCalc3:checked").val()) {
			var bdata = getBirth10Count(birthData[i][0].v,end-begin+1);
			count=(count-bdata)/bdata*10000;
			count=Math.round(count)/100;
			tempData[i]=[ birthData[i][0], {v: count, f: count+"%"} ];
		} else
		tempData[i]=[ birthData[i][0], {v:count} ];
		if (maxB<Math.abs(count))
			maxB=Math.ceil(Math.abs(count));
	}
	data.addRows(tempData);	

	chartblock=true;
	if ($("#dataCalc3:checked").val())
		geochart.draw(data, {width: 700, height: 436, region:"BG", resolution:"provinces", colorAxis:{minValue: -maxB, maxValue: maxB,  colors: ['red','#efe6dc', 'green']}});
	else
		geochart.draw(data, {width: 700, height: 436, region:"BG", resolution:"provinces", colorAxis:{minValue: 0, maxValue: maxB} });	
}

function drawIfReady() {
	//add a click clue on the active regions
	$('#visualizationMap iframe').contents().find("path[fill='#ffffff']").css("cursor","pointer");
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
		return false;
	else
		chartdata={"begin":begin, "end":end};

	if (chartblock==false)
		drawVisualization(begin, end);
	else 
		chartblock={"begin":begin, "end":end};
	return true;
}


function startSlider(){
	$( "#slider-range" ).slider({
		range: true,
		min: 0,
		max: header.length-1,
		animate: "fast",
		values: [ header.length-15 , header.length-1 ],
		slide: function( event, ui ) {
			var left=ui.values[0];
			var right=ui.values[1];
			$( "#date-amount" ).text( header[left] + " до " + header[right] );
			if (header[left].split(".")[2]==2011)
				$( "#date-warning" ).text("("+l.incomplete+")");
			else
			if ($( "#date-warning" ).text()!="")
				$( "#date-warning" ).text("");

			draw( left, right );
		},
		change: function( event, ui ) {
			drawChart(colchartregion);
		}
	});
	$( "#date-amount" ).text( header[header.length-15] + " - " + header[header.length-1] );
	draw(header.length-15 , header.length-1);
}

function startCensusSlider(){
	$( "#slider-census-range" ).slider({
		range: true,
		min: 1,
		max: 18,
		animate: "fast",
		values: [ 5 , 12 ],
		slide: censusSliderSlide,
		change: censusSliderSlide
	});
	$( "#span-age" ).text(censusHeader[4].split("-")[0]+" до "+censusHeader[11].split("-")[1]);
	updateCensusCount(5,12);
}

function censusSliderSlide( event, ui ) {
	var from=ui.values[0]==18 ? "" : censusHeader[ui.values[0]-1].split("-")[0]+" до ";
	var to=ui.values[1]==18 ? censusHeader[ui.values[1]-1] : censusHeader[ui.values[1]-1].split("-")[1];
	$( "#span-age" ).text( from+to );
	updateCensusCount(ui.values[0],ui.values[1]);
	draw();
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

function getBirth10Count(region,days) {
	for (var i=0;i<birth10Data[0].length;i++)
		if (birth10Data[0][i]==region)
			return birth10Data[1][i]*days/365;
	return 1;
}


