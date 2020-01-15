function getGraphData(url) {
  url = encodeURI(url);

  try {
    // Try and fetch the specified url.
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true});
    return response;

  } catch (e) {
    
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true});
    return response;
  }
}

// Get data from Facebook Graph API
function graphData(request, query) {  
  var pageId = request.configParams['page_id'];
  var requestEndpoint = "https://graph.facebook.com/v5.0/";
  
  // Set start and end date for query
  var startDate = new Date(request['dateRange'].startDate);
  var endDate = new Date(request['dateRange'].endDate);
  
  /*
  -------------------------------------------------------
  Create chunks of the date range because of query limit
  -------------------------------------------------------
  */
  
  var offset = 1; // Results are reported on the startDate and between 'until'. So 1 day is added.
  var chunkLimit = 30 - offset; // Limit of 30 days of data per query
  var daysBetween = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24); // Calculate time difference in milliseconds. Then divide it with milliseconds per day 
  
  //console.log("query: %s, startDate: %s, endDate: %s, daysBetween: %s", query, startDate, endDate, daysBetween);
    
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
      chunk['until'] = new Date(chunk['since'].getTime()+(86400000*(leftoverDays)));
      
      // Add chunk to queryChunks list
      queryChunks.push(chunk);
     
    }
    
  }
  // If days between startDate and endDate are less than or equal to the limit
  else {
      var chunk = {};
      chunk['since'] = startDate;
      chunk['until'] = new Date(endDate.getTime()+(86400000*offset)); //endDate + until offset in milliseconds
    
    // When date range is 'yesterday', make sure the until date is today
    /*if (endDate == startDate) {
       chunk['until'] = new Date(endDate.getTime()+(86400000*offset)-1); //endDate + until offset in milliseconds
    }*/
    
      // Add chunk to queryChunks list
      queryChunks.push(chunk);
  }
   
  /*
  ------------------------------------------------------
  Loop the chunks and perform the API request per chunk
  ------------------------------------------------------
  */
  
  
  
  /*//Get page access token
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
  
  /*
  
   //Get instagram account ID
  var instagramUrl = requestEndpoint+pageId+"/?fields=instagram_business_account&access_token="+pageToken;
  var instagramResponse = UrlFetchApp.fetch(instagramUrl,
      {
        muteHttpExceptions : true
      });
  var instagramId = JSON.parse(instagramResponse).instagram_business_account.id;
  */
  
  requestEndpoint += "17841400245502227"+"/";
  
  
  // Define data object to push the graph data to
  var dataObj = {};
  //console.log(queryChunks);
  
  // If page name, id
  if (query.indexOf('?fields=id,name') > -1) {
        
    // Perform API Request
    var requestUrl = requestEndpoint+query+"&access_token="+pageToken;
    
    console.log(requestUrl);
    
    //Parse data
    dataObj = JSON.parse(getGraphData(requestUrl));
  } else {
    
    
    // Define properties
    dataObj = {'followers_count':{},
               'impressions':{},
               'reach':{},
               'engagement':{}};    
    // Loop queryChunks
    for(var i = 0; i < queryChunks.length; i++) {
            
      // Set date range parameters
      var dateRangeSince = queryChunks[i]['since'].toISOString().slice(0, 10);
      var dateRangeUntil = queryChunks[i]['until'].toISOString().slice(0, 10);
      
      //Replace all occurences of date range placeholders from query
      var requestQuery = query.replace(/\[dateSince\]/g, dateRangeSince).replace(/\[dateUntil\]/g, dateRangeUntil);
      
      
      // Perform API Request
      var requestUrl = requestEndpoint+requestQuery+"&access_token="+pageToken;
      
      console.log(requestUrl);

      // Parse data
      var parseData = JSON.parse(getGraphData(requestUrl));
      
      // Loop all nested objects in parseData object
      for (var parsedObj in parseData) {
        
        // Determine if object already contains data
        if (typeof parseData[parsedObj]['data'] === 'undefined') {
          dataObj[parsedObj] = parseData[parsedObj];
        }
        
        // Determine if 'data' object exists in nested object
        if (typeof parseData[parsedObj]['data'] !== 'undefined' &&  parseData[parsedObj]['data'].length > 0) {
          
          
          // Determine if nested object is a 'posts' object
          if (parsedObj == 'media') {
            dataObj[parsedObj] = parseData[parsedObj];
          } else {
            
            for(var d = 0; d < parseData[parsedObj]['data'].length; d++) {
              for (var property in dataObj) {
                
                // Determine if property exists in data object
                if (parseData[parsedObj]['data'][d]['name'] == property) {
                  var dataPeriod = parseData[parsedObj]['data'][d]['period'];
                  dataObj[property]['daysBetween'] = daysBetween;
                  dataObj[property][dataPeriod] = [];
                  dataObj[property][dataPeriod].push(parseData[parsedObj]['data'][d]['values']);
                  
                }
                
              }
              
            }
          }
          
        }
        
      }
      
    }
  }
  
  //console.error(JSON.stringify(dataObj));
  
  
  return dataObj;
}