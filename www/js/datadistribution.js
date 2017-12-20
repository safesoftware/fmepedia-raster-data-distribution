var lon = -123.114166;
var lat = 49.264549;

$(document).ready(function() {
  $.getJSON("http://demos.fmeserver.com.s3.amazonaws.com/server-demo-config.json", function(config) {
    dataDist.init({
      host : config.initObject.server,
      token : config.initObject.token
    });
  });
});

$(window).resize(function(){
  $('#parameters').height($('#map_canvas').height()*0.5);
});

var dataDist = (function () {

  // privates
  var repository = 'Demos';
  var workspaceName = '000002372_RatserDataDownload.fmw';
  var host;
  var token;

  /**
   * Run when the page loads. Callback from the FMEServer API. JSON returned from
   * the REST API parsed and a HTML published parameter form dynamically created.
   * @param  {JSON} json Returned from the Rest API callback
   */
  function buildParams(json){

    var parameters = $('<div id="parameters" />');
    parameters.insertBefore('#submit');

    // Generates standard form elelemts from
    // the getWorkspaceParameters() return json object
    FMEServer.generateFormItems('parameters', json);

    // Add styling classes to all the select boxes
    var selects = parameters.children('select');
    for(var i = 0; i < selects.length; i++) {
        selects[i].setAttribute('class', 'input-customSize');
    }

    // Remove the auto generated GEOM element and label
    $("#parameters .GEOM").remove();

    $('#parameters').height($('#map_canvas').height()*0.5);
  }

  /**
   * Builds up the URL and query parameters.
   * @param  {Form} formInfo Published parameter form Object.
   * @return {String} The full URL.
   */
  function buildURL(formInfo){
    var str = '';
    str = host + '/fmedatadownload/' + repository + '/' + workspaceName + '?';
    var elem = formInfo[0];
    for(var i = 0; i < elem.length; i++) {
      if(elem[i].type !== 'submit') {

        if(elem[i].type === "checkbox" && elem[i].checked) {
          str += elem[i].name + "=" + elem[i].value + "&";
        } else if(elem[i].type !== "checkbox") {
          str += elem[i].name + "=" + elem[i].value + "&";
        }
      }
    }
    str = str.substring(0, str.length - 1);
    return str;
  }


  /**
   * Run on Submit click. Callback for the FMESERVER API.
   * from the translation which is displayed in a panel.
   * @param  {JSON} result JSON returned by the data download service call.
   */
  function displayResult(result){
    var resultText = result.serviceResponse.statusInfo.status;
     var featuresWritten = result.serviceResponse.fmeTransformationResult.fmeEngineResponse.numFeaturesOutput;
     var resultUrl = '';
     var resultDiv = $('<div />');

     if(resultText == 'success'){
       if (featuresWritten != 0){
         resultUrl = result.serviceResponse.url;
         resultDiv.append($('<h2>' + resultText.toUpperCase() + '</h2>'));
         resultDiv.append($('<a href="' + resultUrl + '">' + 'Download Data </a>'));
       }
       else {
         resultDiv.append($('<h2>No output dataset was produced by FME because no features were found in the selected area.</h2>'));
       }
     }
     else{
       resultDiv.append($('<h2>There was an error processing your request</h2>'));
       resultDiv.append($('<h2>' + result.serviceResponse.statusInfo.message + '</h2>'));
     }

     $('#results').html(resultDiv);
  }


  /**
   * ----------PUBLIC METHODS----------
   */
  return {

    init : function(params) {
      var self = this;
      host = params.host;
      token = params.token;
      hostVisible = params.hostVisible;

      //initialize map and drawing tools
      //will eventually be different for each web map type
      var query = document.location.search;
      var mapService = query.split('=');
      mapManager = new GoogleMapsManager();
      polygonControl = new GoogleMapsPolygonDrawTools(mapManager.myGoogleMap);
      mapManager.myGoogleMap.data.loadGeoJson('js/RasterBoundaries.json');


      FMEServer.init({
        server : host,
        token : token
      });

      //set up parameters on page
      FMEServer.getWorkspaceParameters(repository, workspaceName, buildParams);

      $('#geom').change(function(){
        dataDist.updateQuery();
      });
    },

    /**
     * Called by the form when the user clicks on submit.
     * @param  {Form} formInfo Published parameter form Object.
     * @return {Boolean} Returning false prevents a new page loading.
     */
    orderData : function(formInfo){

      if ($("#geom").val() === "") {
        alert('Please draw a polygon and create a clipping area.');
        return false;
      }

      $("#results").empty();
      $("#results").append('<span class="loading-image"><img src="img/loading.gif"></img><br><h3 class="lead">Loading Results...</h3></span>');

      var params = '';
      var elem = formInfo.elements;
      for(var i = 0; i < elem.length; i++) {
        if(elem[i].type !== 'submit') {
          if(elem[i].type === "checkbox" && elem[i].checked) {
            params += elem[i].name + "=" + elem[i].value + "&";
          } else if(elem[i].type !== "checkbox") {
            params += elem[i].name + "=" + elem[i].value + "&";
          }
        }
      }
      params = params.substr(0, params.length-1);
      FMEServer.runDataDownload(repository, workspaceName, params, displayResult);
      return false;
    },

    /**
     * Updates the URL text, called when a form item changes.
     */
    updateQuery : function(){
      var queryStr = buildURL($('#fmeForm'));
      $('#query-panel-results').text(queryStr);
    }
  };
}());
