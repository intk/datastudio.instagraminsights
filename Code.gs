var cc = DataStudioApp.createCommunityConnector();

function getConfig() {
  var config = cc.getConfig();

  config.newInfo()
      .setId('instructions')
  .setText('Please enter the configuration data for your Facebook connector');

  config.newTextInput()
      .setId('page_id')
      .setName('Enter your Facebook Page Id')
      .setHelpText('Find the page Id on the \'About\' section of your page')  
      .setPlaceholder('Enter Facebook Page Id here')
      .setAllowOverride(false);
  
  config.setDateRangeRequired(true);

  return config.build();
}

  /*
  ------------------------------------------------------
  DataStudio fields
  ------------------------------------------------------
  */

function getFields() {
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType; 
  
  fields.newMetric()
      .setId('profileFollowers')
      .setName('Profile Followers')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newMetric()
      .setId('profileImpressions')
      .setName('Profile Impressions')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newMetric()
      .setId('profileReach')
      .setName('Profile Reach')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newDimension()
      .setId('postDate')
      .setName('Post Date')
      .setType(types.YEAR_MONTH_DAY);

  fields.newDimension()
      .setId('postCaption')
      .setName('Post Caption')
      .setType(types.TEXT);  

  fields.newDimension()
      .setId('postLink')
      .setName('Link to post')
      .setType(types.URL);

  fields.newDimension()
       .setId('postMessageHyperLink')
       .setName('Post Caption Link')
       .setType(types.HYPERLINK)
       .setFormula('HYPERLINK($postLink,$postCaption)');
  
  return fields;
}


function getSchema(request) {  
    var fields = getFields().build();
    return { 'schema': fields };    
}

function getData(request) {   
  
  var nestedData = graphData(request, "?fields=followers_count,insights.metric(impressions, reach).period([dataPeriod]).since([dateSince]).until([dateUntil]),media.fields(caption,timestamp,permalink)");
  
  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });
  
  
  var outputData = {};
  var requestedFields = getFields().forIds(requestedFieldIds);
  
  // Perform data request per field
  request.fields.forEach(function(field) {
    var rows = [];
    
        if (field.name == 'profileFollowers') {
          outputData.profile_followers = nestedData['followers_count'];
        }
        if (field.name == 'profileImpressions') {
          outputData.profile_impressions = nestedData['impressions'];
        }
        if (field.name == 'profileReach') {
          outputData.profile_reach = nestedData['reach'];
        }
        if (field.name == 'postDate' || field.name == 'postCaption' || field.name == 'postLink') {
          outputData.posts = nestedData['media'];
        }
        
        if (typeof outputData !== 'undefined') {    
          rows = reportToRows(requestedFields, outputData);
          // TODO: parseData.paging.next != undefined
        } else {
          rows = [];
        }
         result = {
            schema: requestedFields.build(),
            rows: rows
          };  
    
  });
  
  return result;  
}


//Exclude non-unique users from 7 or 28 days data
function periodData(report) {
  
  if (report.daysBetween == 27 && typeof report.days_28 !== 'undefined') {
    report = report.days_28;
    report[report.length-1] = report[report.length-1].slice(report[report.length-1].length-1);
  }
  else if (report.daysBetween == 6 && typeof report.week !== 'undefined') {
    report = report.week;
    report[report.length-1] = report[report.length-1].slice(report[report.length-1].length-1);
    
    // If date range is not 7 or 28 days
  } else {
    report = report.day;
  }
  return report;
}

// Report all daily reports to rows 
function reportDaily(report, type) {
  var rows = [];
  
    //Exclude non-unique users from 7 or 28 days data
    report = periodData(report) ;
  
    
  //Loop chunks
  for (var c = 0; c <  report.length; c++) {
  
    var valueRows = report[c];
    
    // Loop report
    for (var i = 0; i < valueRows.length; i++) {
      var row = {};
      
      row[type] = report[c][i]['value'];
      
      // Assign all data to rows list
      rows.push(row);
      
    }
  }

  return rows;
}

function reportSingleMetric(report, type) {
  var rows = [];
  var row = {};
  row[type] = report;
  rows[0] = row;
  
  return rows;
  
}

function reportPosts(report) {  
  var rows = [];

  // Loop posts
  for( var i = 0; i < report.data.length; i++) {

    // Define empty row object
    var row = {};
    
    //Return date object to ISO formatted string
    row["postDate"] = new Date(report.data[i]['timestamp']).toISOString().slice(0, 10);

    row["postCaption"] = report.data[i]['caption'];
    row["postLink"] = report.data[i]['permalink'];
    
    /*

    row["postLikes"] = 0;

    // Determine if likes object exist
    if (typeof report.data[i]['like_count'] !== 'undefined') {
      row["postLikes"] = report.data[i]['like_count'];
    }

    row["postComments"] = 0;
    if (typeof report.data[i]['comments_count'] !== 'undefined') {
      row["postComments"] = report.data[i]['comments_count'];
    }
    */

    // Assign all post data to rows list
    rows.push(row);
  }
  return rows;
}

function reportToRows(requestedFields, report) {
  var rows = [];
  var data = [];  
  
  if (typeof report.profile_followers !== 'undefined') {
    data = data.concat(reportSingleMetric(report.profile_followers, 'profileFollowers'));
  }
  if (typeof report.profile_impressions !== 'undefined') {
    data = data.concat(reportDaily(report.profile_impressions, 'profileImpressions'));
  }
  if (typeof report.profile_reach !== 'undefined') {
    data = data.concat(reportDaily(report.profile_reach, 'profileReach'));
  }
  if (typeof report.posts !== 'undefined') {
    data = data.concat(reportPosts(report.posts));
  }  
  
  // Merge data
  for(var i = 0; i < data.length; i++) {
    row = [];    
    requestedFields.asArray().forEach(function (field) {
      
      //When field is undefined, don't create empty row
      if (typeof data[i][field.getId()] !== 'undefined') {
        return row.push(data[i][field.getId()]);
      }
      
    });
    if (row.length > 0) {
      rows.push({ values: row });
    }
  }
    
  return rows;
    
}


function isAdminUser(){
 var email = Session.getEffectiveUser().getEmail();
  if( email == 'steven@itsnotthatkind.org' || email == 'analyticsintk@gmail.com'){
    return true; 
  } else {
    return false;
  }
}

/**** BEGIN: OAuth Methods ****/

function getAuthType() {
  var response = { type: 'OAUTH2' };
  return response;
}

function resetAuth() {
  getOAuthService().reset();
}

function isAuthValid() {
  return getOAuthService().hasAccess();
}

function getOAuthService() {
  return OAuth2.createService('exampleService')
    .setAuthorizationBaseUrl('https://www.facebook.com/dialog/oauth')
    .setTokenUrl('https://graph.facebook.com/v5.0/oauth/access_token')      
    .setClientId(CLIENT_ID)
    .setClientSecret(CLIENT_SECRET)
    .setPropertyStore(PropertiesService.getUserProperties())
    .setCallbackFunction('authCallback')
    .setScope('pages_show_list, manage_pages, instagram_manage_insights, instagram_basic');
};

function authCallback(request) {
  var authorized = getOAuthService().handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab');
  };
};

function get3PAuthorizationUrls() {
  return getOAuthService().getAuthorizationUrl();
}

/**** END: OAuth Methods ****/
