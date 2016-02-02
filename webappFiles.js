var webappFiles = {
    // 3rd party libs
    thirdParty: {
        'js': [
            'bower_components/angular/angular.min.js',
            'bower_components/angular-route/angular-route.min.js',
            'bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
            'bower_components/angulartics/dist/angulartics.min.js',
            'bower_components/angulartics/dist/angulartics-piwik.min.js',
            'bower_components/d3/d3.min.js',
            'bower_components/jquery/dist/jquery.min.js',
            'app/vendor/cola/cola.min.js',
            'app/js/angularjs-viewhead.js',
            'bower_components/angular-animate/angular-animate.min.js',
            'bower_components/angular-read-more/dist/readmore.min.js',
            'bower_components/lodash/lodash.min.js'
        ],

        'css': [
            'bower_components/bootstrap/dist/css/bootstrap.css',
            // 'app/vendor/datatables/buttons.dataTables.min.css'
        ],
        'cssCopyDir': [
            'bower_components/components-font-awesome/**/*'
        ]
    },

    cttv: {
        'js': [
            // Our angular stuff
            'app/js/app.js',
            'app/js/controllers.js',
            'app/js/services.js',
            'app/js/api-service.js',
            'app/js/dictionary-service.js',
            'app/js/const-service.js',
            'app/js/config-service.js',
            'app/js/filters-service.js',
            'app/js/filters.js',
            'app/js/search-box-controller.js',
            'app/js/target-associations-controller.js',
	    'app/js/target-overview-controller.js',
            'app/js/disease-associations-controller.js',
            'app/js/target-disease-controller.js',
            'app/js/target-controller.js',
            'app/js/disease-controller.js',
            'app/js/directives.js',
	    'app/js/donut-directive.js',
	    'app/js/associations-overview-directive.js',
            'app/js/disease-associations-table-directive.js',
            'app/js/target-associations-table-directive.js',
            'app/js/target-associations-tree-directive.js',
            'app/js/target-associations-bubbles-directive.js',
            'app/js/evidence-tables-directives.js',
            'app/js/disease-graph-directive.js',
        ],

        css: [
            // 'app/bower_components/bootstrap/dist/css/bootstrap.css',
            // 'app/bower_components/components-font-awesome/css/font-awesome.css',
            'app/css/app.css',
            // 'app/vendor/datatables/buttons.dataTables.min.css'
        ]
    },

};
module.exports = exports = webappFiles;
