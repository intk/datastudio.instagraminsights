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
    row["postReach"] = report.data[i].insights.data[0].values[0]['value'];
    row["postEngagement"] = report.data[i].insights.data[1].values[0]['value'];

    // Assign all post data to rows list
    rows.push(row);
  }
  return rows;
}