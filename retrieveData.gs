// Report all daily reports to rows 
function reportMetric(report, type) {
  var rows = [];
  
  report = report.day;
    
  //Loop chunks
  for (var c = 0; c <  report.length; c++) {
  
    var valueRows = report[c];
    
    // Loop report
    for (var i = 0; i < valueRows.length; i++) {
      var row = {};
      
      row[type] = report[c][i]['value'];
      
      
      // Add dimension 'month' for new profile followers metric
      if (type == 'profileNewFollowers') {
        
      // Don't show zeroes, when there is no data
      if (row[type] == 0) {
        row[type] = "";
      }
        
        //Change date format to Month (from YYYY-MM-DD to MM)
        row['profileNewFollowersMonth'] = new Date(report[c][i]['end_time']).toISOString().slice(4, 7).replace(/-/g, '');
      }
      
      // Add dimension 'month' for total impressions metric
      if (type == 'profilePostsImpressions') {
        
      // Don't show zeroes, when there is no data
      if (row[type] == 0) {
        row[type] = "";
      }
        
        //Change date format to Month (from YYYY-MM-DD to MM)
        row['profilePostsImpressionsMonth'] = new Date(report[c][i]['end_time']).toISOString().slice(4, 7).replace(/-/g, '');
      }
      
      // Assign all data to rows list
      rows.push(row);
      
    }
  }

  return rows;
}

// Report interactions
function reportInteractions(report) {
  var rows = [];
  var reportPageViews = report[0].day;
  var reportWebsiteClicks = report[1].day;
  
  //Loop chunks
  for (var c = 0; c <  reportPageViews.length; c++) {
     var valueRows = reportPageViews[c];
    
    // Loop report
    for (var i = 0; i < valueRows.length; i++) {
      var row = {};
      
      // Assign values to organic impressions metrics
      row['profileInteractionsMonth'] = new Date(new Date(reportPageViews[c][i]['end_time']).getTime()).toISOString().slice(4, 7).replace(/-/g, '');
      row['profileViews'] = reportPageViews[c][i]['value'] || "";
      row['profileWebsiteClicks'] = reportWebsiteClicks[c][i]['value'] || "";
      
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

function ucfirst(str) {
    var firstLetter = str.slice(0,1);
    return firstLetter.toUpperCase() + str.substring(1);
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
    row["postType"] = ucfirst(report.data[i]['media_type'].replace('CAROUSEL_ALBUM', 'CAROUSEL').toLowerCase());
    row["postLink"] = report.data[i]['permalink'];
    row["postImageUrl"] = report.data[i]['thumbnail_url'] || report.data[i]['media_url'];
    row["postImpressions"] = report.data[i].insights.data[0].values[0]['value'];
    row["postEngagement"] = report.data[i].insights.data[1].values[0]['value'];

    // Assign all post data to rows list
    rows.push(row);
  }
  return rows;
}

function reportGenderAge(report) {
  var rows = [];
  
  report = report.lifetime;
  //Define fans per gender (female, male, unknown)
  var fans = {};
  fans['Female'] = 0;
  fans['Male'] = 0;
  fans['Unknown'] = 0;

  // Define fans per age
  fans['13-17'] = 0;
  fans['18-24'] = 0;
  fans['25-34'] = 0;
  fans['35-44'] = 0;
  fans['45-54'] = 0;
  fans['55-64'] = 0;
  fans['65+'] = 0;

  // Only report last number of fans per gender/age within date range
  // Get gender/age objects
  var lastObject = report[report.length-1]
  var results = lastObject[lastObject.length-1]['value'];

  // Loop all objects
  for (var property in results) {
    if (results.hasOwnProperty(property)) {

      // Assign values to gender
      switch (true) {
        case (property.indexOf('F') > -1):
        fans['Female'] += results[property];
        break;
        case (property.indexOf('M') > -1):
        fans['Male'] += results[property];
        break;
        case (property.indexOf('U') > -1):
        fans['Unknown'] += results[property];
        break;
      }

      // Assign values to age
      switch (true) {
        case (property.indexOf('13-17') > -1):
          fans['13-17'] += results[property];
          break;
        case (property.indexOf('18-24') > -1):
          fans['18-24'] += results[property];
          break;
        case (property.indexOf('25-34') > -1):
          fans['25-34'] += results[property];
          break;
        case (property.indexOf('35-44') > -1):
          fans['35-44'] += results[property];
          break;
        case (property.indexOf('45-54') > -1):
          fans['45-54'] += results[property];
          break;
        case (property.indexOf('55-64') > -1):
          fans['55-64'] += results[property];
          break;
        case (property.indexOf('65+') > -1):
          fans['65+'] += results[property];
          break;
      }

    }
  }

  for (var property in fans) {
    var row = {};
    if (fans.hasOwnProperty(property)) {
      if (property.indexOf('Female') > -1 || property.indexOf('Male') > -1 || property.indexOf('Unknown') > -1) {
        row['profileFollowersGender'] = property;
        row['profileFollowersGenderNumber'] = fans[property];
      } else { 
        row['profileFollowersAge'] = property;
        row['profileFollowersNumber'] = fans[property];
      }
    }
    rows.push(row);

   }

  return rows;

}

//Report language of profile followers
function reportLocale(report, type) {
  var rows = [];
  report = report.lifetime;
  
  var lastObject = report[report.length-1];
  var results = lastObject[lastObject.length-1]['value'];
  
  for (var property in results) {
    var row = {};
    row[type] = property;
    row['profileAudienceLanguageFollowers'] = results[property];
    
    rows.push(row);
  }
   return rows;
}