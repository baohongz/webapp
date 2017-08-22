

function initApp (deps) {

    var app = angular.module('cttvApp', deps);

    // app.config([localStorageServiceProvider, function (localStorageServiceProvider) {
    //   localStorageServiceProvider
    //     .setPrefix('openTargets');
    // }]);

    app.config(['$routeProvider', '$locationProvider',
        function($routeProvider, $locationProvider) {
            'use strict';

            $routeProvider.
                when('/', {
                    templateUrl: 'src/partials/intro.html'
                }).
                when('/search', {
                    templateUrl: 'src/partials/search.html',
                    controller: 'SearchAppCtrl'
                }).
        	    when('/target/:id/associations', {
                    templateUrl: 'src/partials/target-associations.html',
                    controller: 'targetAssociationsCtrl',
                    reloadOnSearch: false
        	    }).
        	    when('/disease/:id/associations', {
                    templateUrl: 'src/partials/disease-associations.html',
                    controller: 'diseaseAssociationsCtrl',
                    reloadOnSearch: false
        	    }).
        	    when('/evidence/:id/:id', {
                    templateUrl: 'src/partials/target-disease.html',
                    controller: 'TargetDiseaseCtrl'
        	    }).
        	    when('/target/:id', {
            		templateUrl: 'src/partials/target.html',
            		controller: 'TargetCtrl'
        	    }).
        	    when('/disease/:id', {
            		templateUrl: 'src/partials/disease.html',
            		controller: 'DiseaseCtrl'
        	    }).
                when('/batch-search', {
                    templateUrl: 'src/partials/batch-search.html',
                    controller: 'BatchSearchCtrl'
                }).
                when ('/summary', {
                    templateUrl: 'src/partials/summary.html',
                    controller: 'SummaryCtrl'
                }).

                // Docs
                when('/faq', {
                    //templateUrl: 'docs/faq.html'
                    templateUrl: 'src/partials/faq.html'
                }).
                when('/data_sources', {
                    //templateUrl: 'docs/data_sources.html'
                    controller: 'DataSourcesCtrl',
                    templateUrl: 'src/partials/data_sources.html'
                }).
                when('/terms_of_use', {
                    //templateUrl: 'docs/terms_of_use.html',
                    templateUrl: 'src/partials/terms_of_use.html'
                }).
                when('/release-notes', {
                    templateUrl: 'src/partials/release-notes.html'
                }).
                when('/scoring', {
                    //templateUrl: 'docs/scoring.html'
                    templateUrl: 'src/partials/scoring.html'
                }).
                when('/about', {
                    //templateUrl: 'docs/about.html'
                    templateUrl: 'src/partials/about.html'
                }).
                when('/personal-data-collected-examples', {
                    //templateUrl: 'docs/personal-data-collected-examples.html'
                    templateUrl: 'src/partials/personal-data-collected-examples.html'
                }).
                when('/variants', {
                    //templateUrl: 'docs/variants.html'
                    templateUrl: 'src/partials/variants.html'
                }).
                when('/documentation/components', {
                    templateUrl: 'src/partials/docs.html'
                }).
                when('/downloads/data', {
                    templateUrl: 'src/partials/dumps.html'
                }).
                when('/documentation/api', {
                    templateUrl: 'src/partials/api-docs.html'
                }).
                when('/outreach', {
                    templateUrl: 'src/partials/outreach.html',
                    controller: 'OutreachCtrl'
                }).
                otherwise({
                    redirectTo: '/'
                });

            // function supports_history_api() {
            //     return !!(window.history && history.pushState);
            // }

            $locationProvider.html5Mode(true).hashPrefix('!');

        }]);

    return app;
}



var deps = [
    'ngRoute',
    'ngCookies',
    'LocalStorageModule',
    'ui.bootstrap',
    'cttvFilters',
    'cttvControllers',
    'cttvDirectives',
    'angulartics',
    'angulartics.piwik',
    'viewhead',
    'cttvServices',
    'hm.readmore',
    'ngSanitize',
    'swaggerUi',
    'plugins',
    'facets'
];

/*
 * Manual Angular bootstrapping:
 * load the config file first, then bootstrap the app
 */

angular.element(document).ready(
    function() {
        var initInjector = angular.injector(['ng']);
        var $http = initInjector.get('$http');
        var $q = initInjector.get('$q');
        // First get the config file
        $http.get('build/config.json').then(
            function(response) {
                deps = _.concat(deps, getComponents(response.data));
                configSystemjs(response.data, $q).then(function () {
                    var app = initApp(deps);
                    app.constant('initConfig', response.data);
                    angular.bootstrap(document, ['cttvApp']);
                });
            }
        );
    }
);

function getComponents (config) {
    var modules = [];
    var targetSections = config.targetSections;
    for (var i=0; i<targetSections.length; i++) {
        section = targetSections[i];
        if (section.modules) {
            modules = _.concat(modules, section.modules);
        }
    }
    return modules;
}

// Configures systemjs and returns the external dependencies that need to be loaded before bootstrapping (promises).
function configSystemjs (config, $q) {
    var preloads = {};
    var targetSections = config.targetSections;
    var meta = {};
    for (var i=0; i<targetSections.length; i++) {
        if (targetSections[i].dependencies) {
            meta = _.extend(meta, targetSections[i].dependencies);
        }
        if (targetSections[i].predependencies) {
            meta = _.extend(meta, targetSections[i].predependencies);
            preloads = _.extend(preloads, targetSections[i].predependencies);
        }
    }

    // Configure Systemjs
    System.config({
        'baseURL': './',
        'defaultJSExtensions': false,
        'transpiler': false,
        'paths': {
            'github:*': 'jspm_packages/github/*'
        },

        'map': {
            'css': 'github:/systemjs/plugin-css@0.1.21/css.js',
        },
        'meta': meta
    });

    var depsToLoad = Object.keys(preloads);
    var deps = [];
    for (var j=0; j<depsToLoad.length; j++) {
        deps.push(System.import(depsToLoad[j]));
    }
    return $q.all(deps);
}
