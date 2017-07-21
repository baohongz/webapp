


/* Services */

angular.module('cttvServices')




/**
* The API services, with methods to call the ElasticSearch API
*/
    .factory('cttvAPIservice', ['$http', '$log', '$location', '$rootScope', '$q', '$timeout', 'liveConfig', 'cttvConfig', function($http, $log, $location, $rootScope, $q, $timeout, liveConfig, cttvConfig) {
        'use strict';


        /*
        * Initial configuration of the service, with API's URLs
        */
        var cttvAPI = {
            LIMITS: {
                ASSOCIATIONS: 10000,
                EVIDENCE: 10000
            },
            API_DEFAULT_METHOD : "GET",
            API_SEARCH_URL : "search",
            API_EVIDENCE_URL : "evidences",
            API_AUTOCOMPLETE_URL : "autocomplete",
            API_FILTERBY_URL : 'filterby',
            API_EFO_URL : 'disease',
            API_ASSOCIATION_URL : 'associations', // note: these are no longer URLs, but actual API method names
            API_GENE_URL : 'gene',
            API_QUICK_SEARCH_URL : 'quickSearch',
            API_BEST_HIT_SEARCH_URL : 'bestHitSearch',
            API_DISEASE_URL: 'disease',
            API_EXPRESSION_URL: 'expression',
            API_TARGET_URL : 'target',
            API_MULTISEARCH_URL: 'multiSearch',
            API_TARGET_RELATION_URL : 'targetRelation',
            API_DISEASE_RELATION_URL : 'diseaseRelation',
            API_LOG_SESSION_URL : "logSession",
            API_STATS_URL : "stats",
            API_TARGETS_ENRICHMENT_URL: "targetsEnrichment",
            facets: {
                DATATYPE: 'datatype', // 'filterbydatatype',
                PATHWAY: 'pathway', //filterbypathway',
                DATASOURCES: 'datasource', //filterbydatasource',
                SCORE_MIN : 'scorevalue_min', //filterbyscorevalue_min',
                SCORE_MAX : 'scorevalue_max', //filterbyscorevalue_max',
                SCORE_STR : 'stringency',
                THERAPEUTIC_AREA: 'therapeutic_area', //
                TARGET_CLASS: 'target_class'
            }
        };

        var api = cttvApi()
            .prefix(cttvConfig.api)
            // .prefix("/api/")
            // .prefix('http://127.0.0.1:8123/api/')
            .version("latest")
            .prefix("https://www.targetvalidation.org/api/")
            .appname("cttv-web-app")
            .secret("2J23T20O31UyepRj7754pEA2osMOYfFK")
            .verbose(false);

        /**/
        cttvAPI.activeRequests = 0;
        function countRequest(b){
            // $log.log("countRequest:b=", b);
            if(b===false){
                cttvAPI.activeRequests--;
            } else if (b===true){
                cttvAPI.activeRequests++;
            }
        }

        //cttvAPI.activeRequests = function(){
        //    return activeRequests;
        //}

        function isSuccess(status) {
            return 200 <= status && status < 300;
        }

        // Set the version of the rest api if it is set in the live config file
        liveConfig.then (function (config) {
            if (config.apiVersion) {
                api.version(config.apiVersion);
            }
        });

        /*
        * Private function to actually call the API
        * queryObject:
        *  - method: ['GET' | 'POST']
        *  - operation: 'search' | 'evidence' | ...
        *  - trackCall: true | false
        *  - params: Object with:
        *              - q: query string
        *              - from: number to start from
        *              - size: number of results
        *
        */
        var callAPI = function(queryObject){

            var params = queryObject.params;
            // $log.log("callAPI:queryObject=", queryObject);


            countRequest(queryObject.trackCall === false ? undefined : true);

            var deferred = $q.defer();
            var promise = deferred.promise;

            // Params for api.call are: url, data (for POST) and return format

            liveConfig.then (function (config) {
                var url;
                if( queryObject.method === undefined || queryObject.method === 'GET') {
                    url = api.url[queryObject.operation](params);
                } else {
                    var theUrl = api.url[queryObject.operation]();
                    url = theUrl.substring(0, theUrl.length - 1 );
                }
                // $log.warn("URL : " + url);
                api.call(url, (queryObject.method=="POST" ? params : undefined), (params.format || "json"))
                    .then (done)
                    .catch(function (err) {
                        $log.warn("GOT ERROR:", err);
                        cttvAPI.defaultErrorHandler (err, queryObject.trackCall);
                    });
            });


            return promise;


            function done(response) {
                resolvePromise(response);
                if (!$rootScope.$$phase) $rootScope.$apply();
            }

            function resolvePromise(response){
                // normalize internal statuses to 0
                var status = Math.max(response.status, 0);

                countRequest(queryObject.trackCall === false ? undefined : false);
                // we resolve the the promise on the whole response object,
                // so essentially we pass back the un-processed response object:
                // that means the data we're interested is in response.body.
                (isSuccess(status) ? deferred.resolve : deferred.reject)(response);

                // an alternative approach is to resolve the promise on a custom object
                // so that we don't pass back the whole raw response, but rather we make up the object
                // and choose what we want.
                // In this example, we go for a more angular/jquery approach and send back data and status.
                // This means that we have to handle things differently in our success handler...

                // (isSuccess(status) ? deferred.resolve : deferred.reject)({
                //   data : response.body,
                //   status: response.status
                // });
            }
        };


        /**
         * Default error handler function.
         * It simply logs the error to the console. Can be used in then(succ, err) calls.
         */
        cttvAPI.defaultErrorHandler = function(error, trackCall){
            $log.warn("CTTV API ERROR:",error);
            countRequest(trackCall===false ? undefined : false);
            if (error.status === 403) {
                $rootScope.showApiErrorMsg = true;
            }
            if (error.status >= 500) {
                $rootScope.showApiError500 = true;
            }
            if (!$rootScope.$$phase) $rootScope.$apply();
        };

        var optionsToString = function(obj){
            var s="";
            for(var i in obj){
                s+="&"+i+"="+obj[i];
            }
            // remove the leading '&' and returns
            return s.substring(1);
        };


        /*
        *
        * All the get* methods accept an object with the following parameters:
        *  - params: object containing the parameters to pass to the API
        *  - trackCall: true | false (true by default)
        *  - method: GET | POST (GET by default)
        *
        * Each method injects its own operation to this queryObject
        * This is then passed to the callAPI function
        *
        */

        /**
        * Get a full search.
        * Returns a promise object with methods then(), success(), error()
        *
        * Examples:
        *
        * cttvAPI.getSearch({params:{q:'braf'}}).success(function(data) {
        *      $scope.search.results = data;
        *      $log.log(data);
        *  });
        *
        *
        * cttvAPIservice.getSearch({params:{q:val}}).then(function(response){
        *      return response.data.data;
        *  });
        *
        */
        cttvAPI.getSearch = function(queryObject){
            // $log.log("cttvAPI.getSearch()");
            queryObject.operation = cttvAPI.API_SEARCH_URL;
            return callAPI(queryObject);
        };

        cttvAPI.getBestHitSearch = function(queryObject){
            // $log.log("cttvAPI.getBestHitSearch()");
            queryObject.operation = cttvAPI.API_BEST_HIT_SEARCH_URL;
            return callAPI(queryObject);
        };


        cttvAPI.flat2tree = function (flat) {
            return api.utils.flat2tree(flat);
        };


        /**
        * Get the api object to be used outside of angular
        */
        cttvAPI.getSelf = function () {
            return api;
        };



        /**
        * Search for evidence using the evidence() API function.
        * Returns a promise object with methods then(), success(), error()
        */
        cttvAPI.getEvidence = function(queryObject){
            // $log.log("cttvAPI.getEvidence()");

            $queryObject.operation = cttvAPI.API_EVIDENCE_URL;
            return callAPI(queryObject);
        };



        /**
        *
        */
        cttvAPI.getAssociations = function(queryObject){
            queryObject.operation = cttvAPI.API_ASSOCIATION_URL;
            // $log.log("cttvAPI.getAssociations():queryObject=",queryObject);
            return callAPI (queryObject);
        };



        /**
        * Gets the info to be displayed in the serach suggestions box
        * via call to the autocomplete() API method
        */
        cttvAPI.getAutocomplete = function(queryObject){
            // $log.log("cttvAPI.getAutocomplete()");
            queryObject.operation = cttvAPI.API_AUTOCOMPLETE_URL;
            return callAPI (queryObject);
        };



        /**
        * Get disease details via API efo() method based on EFO code
        * queryObject params:
        *  - efo: the EFO code in format "EFO_xxxxxxx"
        */
        cttvAPI.getEfo = function(queryObject){
            // $log.log("cttvAPI.getEfo");
            queryObject.operation = cttvAPI.API_EFO_URL;
            return callAPI (queryObject);
        };


        /**
        * Get gene details via API gene() method based on ENSG code
        * queryObject params:
        *  - target_id: the ENSG code, e.g. "ENSG00000005339"
        */
        cttvAPI.getTarget = function(queryObject){
            // $log.log("cttvAPI.getTarget "+queryObject.target_id);
            queryObject.operation = cttvAPI.API_TARGET_URL;
            return callAPI (queryObject);
        };

        /**
        * Get disease details via API disease() method based on EFO ids
        * queryObject params:
        *  - code: the (EFO) code
        */
        cttvAPI.getDisease = function (queryObject) {
            // $log.log ("cttvAPI.getDisease "+queryObject.code);
            queryObject.operation = cttvAPI.API_DISEASE_URL;
            return callAPI (queryObject);
        };

        cttvAPI.getFilterBy = function(queryObject){
            // $log.log("cttvAPI.getFilterBy");
            queryObject.params.expandefo = queryObject.params.expandefo || true;
            queryObject.operation = cttvAPI.API_FILTERBY_URL;
            return callAPI (queryObject);
        };

        cttvAPI.getQuickSearch = function(queryObject){
            // $log.log("cttvAPI.getQuickSearch()");
            queryObject.operation = cttvAPI.API_QUICK_SEARCH_URL;
            return callAPI (queryObject);
        };

        cttvAPI.getExpression = function(queryObject){
            // $log.log("cttvAPI.getExpression()");
            queryObject.operation = cttvAPI.API_EXPRESSION_URL;
            return callAPI (queryObject);
        };

        cttvAPI.getMultiSearch = function(queryObject) {
            queryObject.operation = cttvAPI.API_MULTISEARCH_URL;
            return callAPI (queryObject);
        };

        cttvAPI.getTargetsEnrichment = function (queryObject) {
            queryObject.operation = cttvAPI.API_TARGETS_ENRICHMENT_URL;
            return callAPI (queryObject);
        };

        /**
         * Decorates a given object with the API options for the given facets and returns the original object.
         * This can then be used to configure an API call.
         * If no object is supplied to the function, a new object is created and returned.
         */
        cttvAPI.addFacetsOptions = function(facets, obj){
            obj = obj || {};
            for(var i in facets){
                if( facets.hasOwnProperty(i)){
                    obj[cttvAPI.facets[i.toUpperCase()]] = facets[i];
                }
            }
            return obj;
        };



        /**
         * Get relations for specified gene or targer
         */
        cttvAPI.getTargetRelation = function(queryObject){
            // $log.log("cttvAPI.getTargetRelation");
            queryObject.operation = cttvAPI.API_TARGET_RELATION_URL;
            return callAPI (queryObject);
        };



        /**
         * Get relations for specified gene or targer
         */
        cttvAPI.getDiseaseRelation = function(queryObject){
            // $log.log("cttvAPI.getTargetRelation");
            queryObject.operation = cttvAPI.API_DISEASE_RELATION_URL;
            return callAPI (queryObject);
        };



        /**
        * Logs a session event in the API
        * This call is 1-off and it doesn't
        */
        cttvAPI.logSession = function () {
            // $log.log("cttvAPI.logSession");
            var queryObject = {
                operation : cttvAPI.API_LOG_SESSION_URL,
                trackCall: false,
                params: {
                    event: "appload"
                }
            };
            return callAPI (queryObject);
        };



        /**
         * Get the API stats
         */
        cttvAPI.getStats = function () {
            var queryObject = {
                operation : cttvAPI.API_STATS_URL,
                method: 'GET',
                params: {}
            };
            return callAPI (queryObject);
        };



        return cttvAPI;
    }])



    /**
    * A service to handle search in the app.
    * This talks to the API service
    */
    .factory('cttvAppToAPIService', ['$http', '$log', function($http, $log) {
        'use strict';

        var APP_QUERY_Q = "",
        APP_QUERY_PAGE = 1,
        APP_QUERY_SIZE = 10;


        var cttvSearchService = {
            SEARCH: "search",
            EVIDENCE: 'evidence'
        };


        cttvSearchService.createSearchInitObject = function(){
            return {
                query:{
                    q: APP_QUERY_Q,
                    page: APP_QUERY_PAGE,
                    size: APP_QUERY_SIZE
                },

                results:{}
            };
        };



        cttvSearchService.getApiQueryObject = function(type, queryObject){
            var qo = {
                size: queryObject.size,
                from: (queryObject.page - 1) * queryObject.size
            };

            switch (type){
                case this.SEARCH:
                qo.q = queryObject.q.title || queryObject.q;
                break;

                case this.EVIDENCE:
                qo.gene = queryObject.q.title || queryObject.q;
                qo.datastructure = 'simple';
                break;


            }

            return qo;
        };



        cttvSearchService.getSearch = function(){

        };


        /*
        var parseQueryParameters = function(qry){
        // set the query text
        $scope.search.query.q = qry.q || "";

        // set the query size (i.e. results per page)
        //$scope.search.query.size = APP_QUERY_SIZE;
        //if(qry.size){
        //    $scope.search.query.size = parseInt(qry.size);
        //}

        // set the query page
        //$scope.search.query.page = APP_QUERY_PAGE;
        //if(qry.page){
        //    $scope.search.query.page = parseInt(qry.page);
        //}
    }
    */



        /*
        var queryToUrlString = function(){
        return 'q=' + ($scope.search.query.q.title || $scope.search.query.q);
        // for now we don't want to set pagination via full URL
        // as this is causing some scope problems. If needed, we'll think about it
        //+ '&size=' + $scope.search.query.size
        //+ '&page=' + $scope.search.query.page;
        }
        */


        return cttvSearchService;
}]);
