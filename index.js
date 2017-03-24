var express = require('express')
var async = require('async');
const https = require('https');
const http = require('http');

const pathOfRequest = '/v1.0/retrieve.json?token=<insertToken>&groupspace=Airlines&logging=off';

var app = express()

app.get('/', function (req, res) {
    var queries = [];
    var count = 0;

    var distinctQueries = { 
        "{Twitter Mentions - Negative}" : [ "crop [Brand] ~> group by 1 month ~> crush ~> average", "crop [Country] ~> group by 1 month ~> crush ~> average ~> replace {Twitter Mentions - Negative} with {Category Average} ~> calculate 'Round({Category Average}, 0)' returns {Category Average}","group by 1 month ~> crush ~> sum ~> rank competition [Brand] ~> replace {Twitter Mentions - Negative Rank by Brand} with {Rank} ~> filter {Rank}" ], 
        "{Effective Base}{N Weighted}{Unweighted Base}{Weighted Base}" : ["crop [Brand][Metric] ~> filter {Weighted Base}{N Weighted} ~> group by 1 month ~> crush ~> sum ~> calculate '{N Weighted}/{Weighted Base}' returns {Category Average} ~> crop [Metric] ~> average", "crop [Brand][Metric] ~> group by 1 month ~> crush ~> sum ~> calculate 'Round({N Weighted}/{Weighted Base}, 2)' includes {N Value} ~> replace {Unweighted Base} with {Sample Size}", "crop [Brand][Metric] ~> filter {Weighted Base}{N Weighted} ~> group by 1 month ~> crush ~> sum ~> calculate 'Round({N Weighted}/{Weighted Base}, 2)' returns {N Value} ~> rank competition [Brand] ~> replace {N Value Rank by Brand} with {Rank} ~> filter {Rank}","crop [Metric] ~> filter {Effective Base} ~> group by 1 month ~> crush ~> sum ~> replace {Effective Base} with {Effective Base Category Total}"]
    }
    
    for(key in distinctQueries){
        queries.push(getQuery(key, distinctQueries[key]));
    }

    var modules = [1];

    var startPage = new Date().getTime();
    async.each(modules, function(module, done){
        var startModule = new Date().getTime();
        async.each(queries, function(query, done){
            var start = new Date().getTime();
            var body = "";
            var postRequest = https.request(getHeaders(query), function(response){
                response.on('data', function(data){
                    count++;
                    body += data;
                    //console.info('Call #' + count + ' succeded');
                });

                response.on('timeout', function(){
                    console.info('Timeout');
                });

                response.on('end', function(){
                    var end = new Date().getTime();
                    var queryTime = end - start;
                    var parsedBody = JSON.parse(body)
                    //console.info(parsedBody[0].signal + ' : ' + parsedBody[0].time);
                    if(response.statusCode == 200){
                        //console.info(parsedBody[0].signal + ' : ' + parsedBody[0].time);
                        console.info('Status code: ' + response.statusCode);
                    }
                    else {
                        var errorBody = parsedBody;
                        console.info('Error: ' + errorBody.Error);
                        console.info('Status code: ' + response.statusCode);
                    }
                    console.info(queryTime);
                    done();
                });
            });
            postRequest.write(query);
            postRequest
            postRequest.end();
            postRequest.on('error', function(e){
                console.error(e);
            });
        }, function(err){
            if(!err){
                done();
                var endModule = new Date().getTime();
                var moduleTime = endModule - startModule;
                console.info('Module #' + parseInt(module) + ' time in ms: ' + moduleTime);
            }
            else{
                response.send("Something went wrong");
            }
        });
    }, function(err){
        if(err){
            response.send("Something went wrong");
        }
        else{
            var endPage = new Date().getTime();
            var pageTime = endPage - startPage;
            //onsole.info('Page time in ms: ' + pageTime);
        }
    });
    console.info('********************************************');
})

app.listen(3000, function () {
  console.log('App listening on port 3000!')
})


function getQuery(signal, tractors){
    var query = JSON.stringify(
           {
      "time_from": "2016-01-01T00:00:00",
      "time_to": "2017-01-01T00:00:00",
      "signal":  '"' + signal + '"',
      "context": "[Country:UK][Metric:Believe - Brand delivers on its promises][Brand:Monarch (Short Haul)][Brand:Norwegian (Short Haul)][Brand:KLM (Short Haul)][Brand:Aer Lingus (Short Haul)][Brand:Air France (Short Haul)][Brand:British Airways (Short Haul)][Brand:easyJet (Short Haul)][Subgroup:Total Sample]",
      "tractors": tractors,
      "tractor": "sort by time"
    });
    return query;
}

function getHeaders(query){
    var postHeaders = {
        'Content-Type' : 'application/json',
        'Content-Length' : Buffer.byteLength(query, 'utf8')
    }

    var postOptions = {
        host : 'api.datashaka.com',
        port : 443,
        path : pathOfRequest,
        method : 'POST',
        headers : postHeaders
    }

    return postOptions;
}