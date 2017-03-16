var express = require('express')
var async = require('async');
const https = require('https');
const http = require('http');

const pathOfRequest = '/v1.0/retrieve.csv?token=<insert token>&groupspace=<insert groupspace>';

var app = express()

app.get('/', function (req, res) {
    var queries = [];
    var count = 0;
    
    for(var i = 0; i < 5; i++){
        queries.push(getQuery());
    }

    var modules = [1,2,3,4,5];

    var startPage = new Date().getTime();
    async.each(modules, function(module, done){
        var startModule = new Date().getTime();
        async.each(queries, function(query, done){
            var start = new Date().getTime();
            var postRequest = https.request(getHeaders(query), function(response){
                response.on('data', function(data){
                    count++;
                    //console.info('Call #' + count + ' succeded');
                });

                response.on('end', function(){
                    var end = new Date().getTime();
                    var queryTime = end - start;
                    //console.info('Time in ms: ' + queryTime);
                    done();
                });
            });
            postRequest.write(query);
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
            console.info('Page time in ms: ' + pageTime);
        }
    });
    console.info('********************************************');
})

app.listen(3000, function () {
  console.log('App listening on port 3000!')
})


function getQuery(){
    var query = JSON.stringify(
        {
            "time_from": "2015-01-01",
            "time_to": "2016-12-01",
            "signal": "{Effective Base}{N Weighted}{Unweighted Base}{Weighted Base}",
            "context": "[Country:UK][Metric:Believe - Brand delivers on its promises][Brand:Monarch (Short Haul)][Brand:Norwegian (Short Haul)][Brand:KLM (Short Haul)][Brand:Aer Lingus (Short Haul)][Brand:Air France (Short Haul)][Brand:British Airways (Short Haul)][Brand:easyJet (Short Haul)][Subgroup:Total Sample]",
            "tractors": [
                "crop [Brand][Metric] ~> filter {Weighted Base}{N Weighted} ~> group by week ~> pad time ~> roll by 8 last ~> sum ~> calculate '{N Weighted}/{Weighted Base}' returns {Category Average} ~> crop [Metric] ~> average",
                "crop [Brand][Metric] ~> group by week ~> pad time ~> roll by 8 last ~> sum ~> calculate 'Round({N Weighted}/{Weighted Base}, 2)' includes {N Value} ~> replace {Unweighted Base} with {Sample Size}",
                "crop [Brand][Metric] ~> filter {Weighted Base}{N Weighted} ~> group by week ~> pad time ~> roll by 8 last ~> sum ~> calculate 'Round({N Weighted}/{Weighted Base}, 2)' returns {N Value} ~> rank olympic [Brand] ~> replace {N Value Rank by Brand} with {Rank} ~> filter {Rank}",
                "crop [Metric] ~> filter {Effective Base} ~> group by week ~> pad time ~> roll by 8 last ~> sum ~> replace {Effective Base} with {Effective Base Category Total}"
            ],
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