angular.module('otDirectives')
    .directive('otSearchSuggestions', [function () {
        'use strict';

        return {
            restrict: 'AE',
            templateUrl: 'src/components/search-suggestions/search-suggestions.html',
            replace: true
        };
    }]);
