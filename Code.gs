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
      if (field.name == 'accountId') {
        outputData.account_id = graphData(request, "?fields=id,name");
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

function reportToRows(requestedFields, report) {
  var rows = [];
  var data = [];  
  
  if (typeof report.account_id !== 'undefined') {
    data = reportAccountId(report.account_id) || [];
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
        switch (field.getId()) {
          case 'accountId':
            return row.push(data[i]["accountId"]);
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

