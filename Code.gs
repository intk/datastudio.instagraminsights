var cc = DataStudioApp.createCommunityConnector();

function getConfig() {
  var config = cc.getConfig();

  config.newInfo()
      .setId('instructions')
  .setText('Please enter the configuration data for your Instagram connector');

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
  
  fields.newDimension()
      .setId('accountId')
      .setName('Account ID')
      .setType(types.TEXT);  
  
  fields.newMetric()
      .setId('profileFollowers')
      .setName('Followers')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
   fields.newMetric()
      .setId('profileImpressions')
      .setName('Impressions')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newDimension()
      .setId('postDate')
      .setName('Post Date')
      .setType(types.YEAR_MONTH_DAY);
  
   fields.newDimension()
      .setId('postId')
      .setName('Post ID')
      .setType(types.TEXT);  

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
       .setName('Post Message Link')
       .setType(types.HYPERLINK)
       .setFormula('HYPERLINK($postLink,$postCaption)');
  
  fields.newMetric()
      .setId('postLikes')
      .setName('Likes on post')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newMetric()
      .setId('postComments')
      .setName('Comments on post')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
    
  return fields;
}


function getSchema(request) {  
    var fields = getFields().build();
    return { 'schema': fields };    
}

function getData(request) {  
  
  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });
  
  var outputData = {};
  var requestedFields = getFields().forIds(requestedFieldIds);

  
  // Perform data request per field
  request.fields.forEach(function(field) {
    
    var rows = [];
    
    // Try to re-assign data when it fails at first attempt, until rows are filled in
    while (rows.length < 1) {
      if (field.name == 'profileFollowers') {
        outputData.profile_followers = graphData(request, "?fields=followers_count");
      }
      if (field.name == 'profileImpressions') {
        outputData.profile_impressions = graphData(request, "insights?metric=impressions&period=day&fields=values");
      }
      if (field.name == 'accountId') {
        outputData.account_id = graphData(request, "?fields=id,name");
      }
      if (field.name == 'postId' || field.name == 'postDate' || field.name == 'postCaption' || field.name == 'postLink' || field.name == 'postLikes' || field.name == 'postComments') {
        outputData.posts = graphData(request, "media?fields=id,caption,timestamp,permalink,like_count,comments_count");
      }
    
    if (typeof outputData !== 'undefined') {    
       rows = reportToRows(requestedFields, outputData);
        // TODO: parseData.paging.next != undefined
    } else {
       rows = [];
    }
     // Only break attempt to re-assign data if there is no data at all
     if (rows[0] == 'no-data') {
       rows = [];
       break;
    }
      
      result = {
        schema: requestedFields.build(),
        rows: rows
      };  
    }
  });
  
  //cache.put(request_hash, JSON.stringify(result));
  return result;  
  
}

function reportAccountId(report) {
  var rows = [];
    
  var row = {};
  row["accountId"] = report['id'];
  rows[0] = row;
  
  return rows;
}

function reportFollowers(report) {
  var rows = [];
    
  var row = {};
  row["profileFollowers"] = report['followers_count'];
  rows[0] = row;
  
  return rows;
}

// Report all daily reports to rows 
function reportDaily(report, type) {
  var rows = [];
  
  //Loop chunks
  for (var c = 0; c <  report['data'][0]['values'].length; c++) {
  
    var valueRows = report['data'][0]['values'][c];
    
    // Loop report
    for (var i = 0; i < valueRows.length; i++) {
      var row = {};
      
      row[type] = report['data'][0]['values'][c][i]['value'];
      
      // Assign all data to rows list
      rows.push(row);
    }
  }
    console.log("REPORTDAILY: %s", rows);

  return rows;
}

function reportPosts(report) {  
  var rows = [];
  
  // Loop posts
  for( var i = 0; i < report.data.length; i++) {
    
    // Define empty row object
    var row = {};
    row["postId"] = report.data[i]['id'];
    
    //Return date object to ISO formatted string
    row["postDate"] = new Date(report.data[i]['timestamp']).toISOString().slice(0, 10);
    
    row["postCaption"] = report.data[i]['caption'];
    row["postLink"] = report.data[i]['permalink'];
    
    row["postLikes"] = 0;
    
    // Determine if likes object exist
    if (typeof report.data[i]['like_count'] !== 'undefined') {
      row["postLikes"] = report.data[i]['like_count'];
    }
    
    row["postComments"] = 0;
    if (typeof report.data[i]['comments_count'] !== 'undefined') {
      row["postComments"] = report.data[i]['comments_count'];
    }
    
    // Assign all post data to rows list
    rows.push(row);
  }
  return rows;
}


function reportToRows(requestedFields, report) {
  var rows = [];
  var data = [];  
  
  if (typeof report.account_id !== 'undefined') {
    data = reportAccountId(report.account_id) || [];
  } 
  if (typeof report.profile_followers !== 'undefined') {
    data = reportFollowers(report.profile_followers) || [];
  } 
  if (typeof report.profile_impressions !== 'undefined') {
    data = reportDaily(report.profile_impressions, 'profileImpressions');
  }  
  if (typeof report.posts !== 'undefined') {
    data = reportPosts(report.posts) || [];
  } 
  
  //If data doesn't contain any values
  if (data.length < 1) {
    return ['no-data'];
  } else {
    
  // Merge data
  for(var i = 0; i < data.length; i++) {
    row = [];    
    requestedFields.asArray().forEach(function (field) {
      
      // Assign field data values to rows
       if (field.getId().indexOf('post') > -1 && typeof data[i]["postDate"] !== 'undefined') {
        //console.log("ReportToRows_Posts: %s", data[i]["postDate"]);
        switch (field.getId()) {
          case 'postDate':
            return row.push(data[i]["postDate"].replace(/-/g,''));
          case 'postId':
            return row.push(data[i]["postId"]);
          case 'postCaption':
            return row.push(data[i]["postCaption"]);
          case 'postLink':
            return row.push(data[i]["postLink"]);
          case 'postLikes':
            return row.push(data[i]["postLikes"]);
          case 'postComments':
            return row.push(data[i]["postComments"]);
        }
       } else {

         switch (field.getId()) {
           case 'accountId':
             return row.push(data[i]["accountId"]);
           case 'profileFollowers':
             return row.push(data[i]["profileFollowers"]);
           case 'profileImpressions':
             return row.push(data[i]["profileImpressions"]);
         }
       }
      
      
    });
    if (row.length > 0) {
      rows.push({ values: row });
    }
  }
    
  return rows;
    
  }
}


function isAdminUser(){
 var email = Session.getEffectiveUser().getEmail();
  if( email == 'steven@itsnotthatkind.org' ){
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

