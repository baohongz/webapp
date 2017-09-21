/* Evidence tables Directives */

angular.module('otDirectives')

    .directive('otCommonDiseaseTable', ['otApi', 'otConsts', 'otUtils', 'otConfig', '$location', '$log', 'otClearUnderscoresFilter', function (otApi, otConsts, otUtils, otConfig, $location, $log, otClearUnderscoresFilter) {
        'use strict';

        var searchObj = otUtils.search.translateKeys($location.search());
        var checkPath = otUtils.checkPath;

        return {
            restrict: 'AE',

            templateUrl: 'src/components/common-disease-table/common-disease-table.html',

            scope: {
                loadFlag: '=?',    // optional load-flag: true when loading, false otherwise. links to a var to trigger spinners etc...
                data: '=?',        // optional data link to pass the data out of the directive
                title: '=?',       // optional title for filename export
                errorFlag: '=?'    // optional error-flag: pass a var to hold parsing-related errors
            },

            link: function (scope, elem, attrs) {
                scope.errorFlag = false;
                scope.$watchGroup([function () { return attrs.target; }, function () { return attrs.disease; }], function () {
                    if (attrs.target && attrs.disease) {
                        getData();
                    }
                });

                // DO WE NEED THIS???
                jQuery.fn.dataTableExt.oSort['pval-more-asc'] = function (x, y) {
                    var a = x.split('<')[0];
                    var b = y.split('<')[0];
                    return a - b;
                };
                jQuery.fn.dataTableExt.oSort['pval-more-desc'] = function (x, y) {
                    var a = x.split('<')[0];
                    var b = y.split('<')[0];
                    return b - a;
                };

                function getData () {
                    scope.loadFlag = true;
                    var opts = {
                        size: 1000,
                        datasource: otConfig.evidence_sources.genetic_association.common,
                        fields: [
                            'unique_association_fields',
                            'disease',
                            'evidence',
                            'variant',
                            'target',
                            'sourceID',
                            'access_level'
                        ]
                    };

                    if (attrs.target) {
                        opts.target = attrs.target;
                    }
                    if (attrs.disease) {
                        opts.disease = attrs.disease;
                    }
                    _.extend(opts, searchObj);

                    var queryObject = {
                        method: 'GET',
                        params: opts
                    };

                    return otApi.getFilterBy(queryObject)
                        .then(
                            function (resp) {
                                if (resp.body.data) {
                                    scope.data = resp.body.data;
                                    initTable();
                                } else {
                                    $log.warn('Empty response : common disease data');
                                }
                            },
                            otApi.defaultErrorHandler
                        )
                        .finally(function () {
                            scope.loadFlag = false;
                            // updateGeneticAssociationsSetting();  // update for parent accordion panel
                        });
                }


                /*
                 * Takes the data object returned by the API and formats it 
                 * to an array of arrays to be displayed by the dataTable widget.
                 */
                function formatDataToArray (data) {
                    var newdata = [];
                    data.forEach(function (item) {
                        // create rows:
                        var row = [];

                        try {
                            var db = item.sourceID;

                            // col 0: data origin: public / private
                            row.push((item.access_level !== otConsts.ACCESS_LEVEL_PUBLIC) ? otConsts.ACCESS_LEVEL_PUBLIC_DIR : otConsts.ACCESS_LEVEL_PRIVATE_DIR);

                            // disease name
                            row.push(item.disease.efo_info.label);

                            // Variant
                            var mut = '<a class=\'ot-external-link\' href=\'http://www.ensembl.org/Homo_sapiens/Variation/Explore?v=' + item.variant.id.split('/').pop() + '\' target=\'_blank\'>' + item.variant.id.split('/').pop() + '</a>';
                            row.push(mut);

                            // variant type
                            var t = otClearUnderscoresFilter(otUtils.getEcoLabel(item.evidence.evidence_codes_info, item.evidence.gene2variant.functional_consequence.split('/').pop()));
                            row.push(t);

                            // evidence source
                            if (item.sourceID === otConsts.dbs.PHEWAS_23andme) {
                                row.push('<a class=\'ot-external-link\' href=\'https://test-rvizapps.biogen.com/23andmeDev/\' target=\'_blank\'>'
                                    + otClearUnderscoresFilter(item.sourceID)
                                    + '</a>');
                            } else if (item.sourceID === otConsts.dbs.PHEWAS) {
                                row.push('<a class=\'ot-external-link\' href=\'https://phewascatalog.org/phewas\' target=\'_blank\'>'
                                    + otClearUnderscoresFilter(item.sourceID)
                                    + '</a>');
                            } else {
                                row.push('<a class=\'ot-external-link\' href=\'https://www.ebi.ac.uk/gwas/search?query=' + item.variant.id.split('/').pop() + '\' target=\'_blank\'>'
                                    + otClearUnderscoresFilter(item.sourceID)
                                    + '</a>');
                            }

                            // p-value
                            var msg = item.evidence.variant2disease.resource_score.value.toPrecision(1);

                            if (item.sourceID === otConsts.dbs.PHEWAS) {
                                msg += '<div style="margin-top:5px;">Cases: ' + item.unique_association_fields.cases + '<br />Odds ratio: ' + parseFloat(item.unique_association_fields.odds_ratio).toPrecision(2) + '</div>';
                            } else if (item.sourceID === otConsts.dbs.PHEWAS_23andme) {
                                msg += '<br/>Cases: ' + item.unique_association_fields.cases + '<br />Odds ratio: ' + parseFloat(item.unique_association_fields.odds_ratio).toPrecision(2) + '<br />Phenotype: ' + item.unique_association_fields.phenotype;
                            }
                            row.push(msg);

                            // publications
                            var refs = [];
                            if (checkPath(item, 'evidence.variant2disease.provenance_type.literature.references')) {
                                refs = item.evidence.variant2disease.provenance_type.literature.references;
                            }

                            var pmidsList = otUtils.getPmidsList(refs);
                            row.push(pmidsList.length ? otUtils.getPublicationsString(pmidsList) : 'N/A');

                            // Publication ids (hidden)
                            row.push(pmidsList.join(', '));

                            newdata.push(row); // push, so we don't end up with empty rows
                        } catch (e) {
                            scope.errorFlag = true;
                            $log.error('Error parsing common disease data:');
                            $log.error(e);
                        }
                    });
                    return newdata;
                }


                function initTable () {
                    var table = elem[0].getElementsByTagName('table');
                    $(table).DataTable(otUtils.setTableToolsParams({
                        'data': formatDataToArray(scope.data),
                        'ordering': true,
                        'order': [[1, 'asc']],
                        'autoWidth': false,
                        'paging': true,
                        'columnDefs': [
                            {
                                'sType': 'pval-more',
                                'targets': 5
                            },
                            {
                                'targets': [0],    // the access-level (public/private icon)
                                'visible': otConfig.show_access_level,
                                'width': '3%'
                            },
                            {
                                'targets': [7],
                                'visible': false
                            },
                            {
                                'targets': [2, 3, 4, 6],
                                'width': '14%'
                            },
                            {
                                'targets': [1, 5],
                                'width': '10%'
                            }

                        ]
                    }, (scope.title ? scope.title + '-' : '') + '-common_diseases'));
                }
            }
        };
    }]);