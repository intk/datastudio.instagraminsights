// Get data from Facebook Graph API
function graphData(request, query) {
  var pageId = request.configParams['page_id'];
  var requestEndpoint = "https://graph.facebook.com/v5.0/"+pageId+"/"
  
  // Set start and end date for query
  var startDate = new Date(request['dateRange'].startDate);
  var endDate = new Date(request['dateRange'].endDate);
  
  /*
  -------------------------------------------------------
  Create chunks of the date range because of query limit
  -------------------------------------------------------
  */
  
  var offset = 2; // Results are reported the day after the startDate and between 'until'. So 2 days are added.
  var chunkLimit = 93 - offset; // Limit of 93 days of data per query
  var daysBetween = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24); // Calculate time difference in milliseconds. Then divide it with milliseconds per day 
  
  console.log("query: %s, startDate: %s, endDate: %s, daysBetween: %s", query, startDate, endDate, daysBetween);
    
  // Split date range into chunks
  var queryChunks = [];
  
  // If days between startDate and endDate are more than the limit
  if (daysBetween > chunkLimit) {
    var chunksAmount = daysBetween/chunkLimit;
        
    // Make chunks per rounded down chunksAmount
    for (var i = 0; i < Math.floor(chunksAmount); i++) {
      // Define chunk object
      var chunk = {};
      
      // If no chunks have been added to the queryChunks list
      if (queryChunks.length < 1) {
        chunk['since'] = startDate;
        chunk['until'] = new Date(startDate.getTime()+(86400000*(chunkLimit+offset)));
              
      // If a chunk already is added to the queryChunks list
      } else {
        chunk['since'] = new Date(queryChunks[i-1]['until'].getTime()-(86400000*(offset-1))); // 'Until' has offset of 2 days. 'Since' should start 1 day after last date range chunk
        chunk['until'] = new Date(chunk['since'].getTime()+(86400000*(chunkLimit+offset-1)));
      }
            
      // Add chunk to queryChunks list
      queryChunks.push(chunk);
    }
    
    // Make chunk of leftover days if there are any
    if (chunksAmount - queryChunks.length > 0) {
      
      var leftoverDays = Math.floor((chunksAmount - queryChunks.length) * chunkLimit) // Decimal number * chunkLimit rounded down gives the amount of leftover days
      var chunk = {};
      chunk['since'] = new Date(queryChunks[queryChunks.length-1]['until'].getTime()-(86400000*(offset-1))); // 'Until' has offset of 2 days. 'Since' should start 1 day after last date range chunk
      chunk['until'] = new Date(chunk['since'].getTime()+(86400000*(leftoverDays + offset)));
      
      // Add chunk to queryChunks list
      queryChunks.push(chunk);
     
    }
    
  }
  // If days between startDate and endDate are less than or equal to the limit
  else {
      var chunk = {};
      chunk['since'] = startDate;
      chunk['until'] = new Date(endDate.getTime()+(86400000*offset)); //endDate + until offset in milliseconds
    
    // If until is after today, make sure the until date is today
    if (chunk['until'].getTime() > new Date().getTime()) {
       chunk['until'] = new Date(endDate.getTime()+(86400000*offset-1)); //endDate + until offset in milliseconds
    }
    
      // Add chunk to queryChunks list
      queryChunks.push(chunk);
  }
   
  /*
  ------------------------------------------------------
  Loop the chunks and perform the API request per chunk
  ------------------------------------------------------
  */
  
  
  /*
  //Get page access token
  var tokenUrl = requestEndpoint+"?fields=access_token";
  var tokenResponse = UrlFetchApp.fetch(tokenUrl,
      {
        headers: { 'Authorization': 'Bearer ' + getOAuthService().getAccessToken() },
        muteHttpExceptions : true
      });
  var pageToken = JSON.parse(tokenResponse).access_token;
  */
  
  //Use pageToken for testing purposes
  var pageToken = PAGE_TOKEN;
  
  // Define data object to push the graph data to
  var dataObj = {};
  
  
  // If posts object
  
  if (query.indexOf('posts') > -1) {
    // Set date range parameters
    var dateRangeSince = queryChunks[0]['since'].toISOString().slice(0, 10);
    var dateRangeUntil = queryChunks[queryChunks.length-1]['until'].toISOString().slice(0, 10);
    
    var dateRange = "&since="+dateRangeSince+"&until="+dateRangeUntil;
        
    // Perform API Request
    var requestUrl = requestEndpoint+query+dateRange+"&access_token="+pageToken;
    
    console.log(requestUrl);
    
    var response = UrlFetchApp.fetch(requestUrl,
      {
        muteHttpExceptions : true
      });
    
    dataObj = JSON.parse(response);
    
    
  // All other objects  
  } else {
  
    dataObj['data'] = [];
    dataObj['data'][0] = {};
    dataObj['data'][0]['values'] = [];
    
    // Loop queryChunks
    for(var i = 0; i < queryChunks.length; i++) {
      
      // Set date range parameters
      var dateRangeSince = queryChunks[i]['since'].toISOString().slice(0, 10);
      var dateRangeUntil = queryChunks[i]['until'].toISOString().slice(0, 10);
      
      
      var dateRange = "&since="+dateRangeSince+"&until="+dateRangeUntil;
      
      // Perform API Request
      var requestUrl = requestEndpoint+query+dateRange+"&access_token="+pageToken;
      
      console.log(requestUrl);
            
      var response = UrlFetchApp.fetch(requestUrl,
                                       {
                                         muteHttpExceptions : true
                                       });
      
      var parseData = JSON.parse(response);      
            
      // Merge data object with values from response
      if (parseData['data'].length > 0) {
          dataObj['data'][0]['values'].push(parseData['data'][0]['values']);
      }
      
    }
  }
  
  console.log(JSON.stringify(dataObj));
  
  
  return dataObj;
}
