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
  
  fields.newDimension()
      .setId('profileInteractionsMonth')
      .setName('Interactions Month')
      .setGroup('Interactions')
      .setType(types.MONTH);
  
   fields.newMetric()
      .setId('profileWebsiteClicks')
      .setName('Website Clicks')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newMetric()
      .setId('profileViews')
      .setName('Profile Views')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newMetric()
      .setId('profileNewFollowers')
      .setName('New Followers')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
   
  fields.newDimension()
      .setId('profileNewFollowersMonth')
      .setName('New Followers Month')
      .setType(types.MONTH);
  
  fields.newMetric()
      .setId('profilePostsImpressions')
      .setName('Total Impressions')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newDimension()
      .setId('profilePostsImpressionsMonth')
      .setName('Impressions Month')
      .setType(types.MONTH);
  
  fields.newDimension()
      .setId('profileFollowersGender')
      .setName('Gender')
      .setType(types.TEXT);

  fields.newMetric()
      .setId('profileFollowersGenderNumber')
      .setName('Followers per Gender')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newDimension()
      .setId('profileFollowersAge')
      .setName('Age')
      .setType(types.TEXT);

  fields.newMetric()
      .setId('profileFollowersNumber')
      .setName('Followers per Age')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newDimension()
      .setId('profileAudienceLanguage')
      .setName('Language')
      .setType(types.TEXT);
  
  fields.newMetric()
      .setId('profileAudienceLanguageFollowers')
      .setName('Followers per Language')
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
      .setId('postType')
      .setName('Post Type')
      .setType(types.TEXT);  

  fields.newDimension()
      .setId('postLink')
      .setName('Link to post')
      .setType(types.URL);
  
   fields.newDimension()
      .setId('postImageUrl')
      .setName('Post Image Url')
      .setType(types.URL);
  
   fields.newDimension()
       .setId('postImage')
       .setName('Post Image')
       .setType(types.IMAGE)
       .setFormula('IMAGE($postImageUrl)');

  fields.newDimension()
       .setId('postMessageHyperLink')
       .setName('Post Caption Link')
       .setType(types.HYPERLINK)
       .setFormula('HYPERLINK($postLink,$postCaption)');
  
  fields.newMetric()
      .setId('postImpressions')
      .setName('Impressions on post')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newMetric()
      .setId('postEngagement')
      .setName('Engagement on post')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  return fields;
}


function getSchema(request) {  
    var fields = getFields().build();
    return { 'schema': fields };    
}

function getData(request) {   
  
  var nestedData = graphData(request, "?fields=followers_count,insights.metric(profile_views, follower_count, impressions, website_clicks).period(day).since([dateSince]).until([dateUntil]).as(profile_posts),insights.metric(audience_gender_age, audience_locale).period(lifetime).as(demographics),media.fields(caption,media_type, media_url, thumbnail_url, timestamp,permalink,insights.metric(impressions,engagement))");
  
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
        
        if (field.name == 'profileViews' || field.name == 'profileWebsiteClicks') {
          var interactionsData = [nestedData['profile_views'],nestedData['website_clicks']];
          outputData.profile_interactions = interactionsData;
        }

    
        if (field.name == 'profilePostsImpressions') {
          outputData.profile_posts_impressions = nestedData['impressions'];
        }
    
        if (field.name == 'profileNewFollowers') {
          outputData.profile_new_followers = nestedData['follower_count'];
        }
    
        if (field.name == 'profileFollowersAge' || field.name == 'profileFollowersGender') {
          outputData.profile_gender_age = nestedData['audience_gender_age'];
        }
        if (field.name == 'profileAudienceLanguage') {
          outputData.profile_audience_language = nestedData['audience_locale'];
        }
    
        if (field.name == 'postDate' || field.name == 'postEngagement') {
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

function reportToRows(requestedFields, report) {
  var rows = [];
  var data = [];  
  
  if (typeof report.profile_followers !== 'undefined') {
    data = data.concat(reportSingleMetric(report.profile_followers, 'profileFollowers'));
  }
  if (typeof report.profile_interactions !== 'undefined') {
    data = data.concat(reportInteractions(report.profile_interactions));
  }
  if (typeof report.profile_posts_impressions !== 'undefined') {
    data = data.concat(reportMetric(report.profile_posts_impressions, 'profilePostsImpressions'));
  }
  if (typeof report.profile_new_followers !== 'undefined') {
    data = data.concat(reportMetric(report.profile_new_followers, 'profileNewFollowers'));
  }
  if (typeof report.profile_gender_age !== 'undefined') {
    data = data.concat(reportGenderAge(report.profile_gender_age));
  }  
  if (typeof report.profile_audience_language !== 'undefined') {
    data = data.concat(reportLocale(report.profile_audience_language, 'profileAudienceLanguage'));
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
