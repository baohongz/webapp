
angular.module('cttvControllers')

/**
* TargetCtrl
* Controller for the target page
* It loads information about a given target
*/
.controller ("TargetCtrl", ["$scope", "$location", "$log", "cttvAPIservice", "$http", "$sce", function ($scope, $location, $log, cttvAPIservice, $http, $sce) {
    "use strict";
    $log.log('TargetCtrl()');
    // var cttvRestApi = cttvApi();
    var geneId = $location.url().split("/")[2];
    // var url = cttvRestApi.url.gene({'gene_id' : geneId});
    // $log.log(url);
    // cttvRestApi.call(url)

    cttvAPIservice.getGene({
        "gene_id": geneId
    })
    .then(
        // success
        function (resp) {
            resp = JSON.parse(resp.text);
            $scope.target = {
                label : resp.approved_name || resp.ensembl_external_name,
                symbol : resp.approved_symbol || resp.ensembl_external_name, //resp.approved_symbol || resp.approved_name || resp.ensembl_external_name,
                id : resp.approved_id || resp.ensembl_gene_id,
                description : resp.uniprot_function[0],
                name : resp.approved_name || resp.ensembl_description
            };

            // Synonyms
            var syns = {};
            var synonyms = resp.symbol_synonyms;
            if (synonyms !== undefined) {
                for (var i=0; i<synonyms.length; i++) {
                    syns[synonyms[i]] = 1;
                }
            }
            var prev_symbols = resp.previous_symbols;
            if (prev_symbols !== undefined) {
                for (var j=0; j<prev_symbols.length; j++) {
                    syns[prev_symbols[j]] = 1;
                }
            }
            var name_synonyms = resp.name_synonyms;
            if (name_synonyms !== undefined) {
                for (var k=0; k<name_synonyms.length; k++) {
                    syns[name_synonyms[k]] = 1;
                }
            }
            $log.log(synonyms);
            $scope.synonyms = _.keys(syns);

            // Uniprot
            $scope.uniprot = {
                id : resp.uniprot_id,
                subunits : resp.uniprot_subunit,
                locations : resp.uniprot_subcellular_location,
                accessions : resp.uniprot_accessions,
                keywords : resp.uniprot_keywords
            };

            // Ensembl
            var isHuman = resp.ensembl_gene_id.substring(0,4) === "ENSG";
            $scope.ensembl = {
                id : resp.ensembl_gene_id,
                description : resp.ensembl_description,
                isHuman : isHuman,
                chr : resp.chromosome,
                start : resp.gene_start,
                end : resp.gene_end
            };

            // GO terms
            // var goterms = _.filter(resp.dbxrefs, function (t) {return t.match(/^GO:/)});
            // var cleanGoterms = _.map(goterms, function (t) {return t.substring(3, t.length)});
            // var uniqGoterms = _.uniq(cleanGoterms);
            // $scope.goterms = uniqGoterms;
            // var gos = _.pluck(resp.go, 'term');
            var gosByOntology = {
                'F' : [],
                'C' : [],
                'P' : []
            };

            var gos = _.keys(resp.go);
            for (var ii=0; ii<gos.length; ii++) {
                var goid = gos[ii];
                var ontology = resp.go[goid].term.substring(0,1);
                gosByOntology[ontology].push ({label: resp.go[goid].term.substring(2),
                    goid: goid
                });
            }

            var goArr = [];
            if (gosByOntology.F.length) {
                goArr.push (
                    {
                        "Ontology" : "Molecular Function",
                        "terms" : gosByOntology.F
                    }
                );
            }

            if (gosByOntology.P.length) {
                goArr.push (
                    {
                        "Ontology" : "Biological Process",
                        "terms" : gosByOntology.P
                    }
                );
            }

            if (gosByOntology.C.length) {
                goArr.push (
                    {
                        "Ontology" : "Cellular Component",
                        "terms" : gosByOntology.C
                    }
                );
            }
            $scope.goterms = goArr;

            // Expression Atlas
            $scope.toggleBaselineExpression = function () {
                $scope.eaTarget = resp.ensembl_gene_id;
            };

            // Genome Browser
            $scope.toggleGenomeLocation = function () {
                $scope.chr = resp.chromosome;
                $scope.genomeBrowserGene = resp.ensembl_gene_id;
            };

            // Transcript Viewer
            $scope.toggleTranscriptView = function () {
                $scope.chr = resp.chromosome;
                $scope.transcriptViewerGene = resp.ensembl_gene_id;
            };

            // Protein structure (PDB)
            var pdb = resp.pdb;
            $scope.pdb = {};
            if (_.isEmpty(pdb)) {
                $scope.pdb.nstructures = 0;
                //return;
            } else {
                var firstStructure = _.sortBy(_.keys(pdb))[0].toLowerCase();
                $scope.pdb.id = firstStructure;
                $scope.pdb.nstructures = _.keys(pdb).length;

                // cttvAPIservice.getProxy({
                //     "url" : "http://www.ebi.ac.uk/pdbe/static/entry/" + firstStructure + "_json",
                // })
                // .then (function (resp) {
                // var data = resp.body;
                // var entryImgs = data[firstStructure].entry.all.image;
                // for (var i=0; i<entryImgs.length; i++) {
                //     if (entryImgs[i].filename === (firstStructure + "_deposited_chain_front")) {
                //         $scope.pdb.thumbnailUrl = "//www.ebi.ac.uk/pdbe/static/entry/" + entryImgs[i].filename + data.image_suffix[2]; // 400x400 image
                //         $scope.pdb.alt = entryImgs[i].alt;
                //         $scope.pdb.description = $sce.trustAsHtml(entryImgs[i].description);
                //         return;
                //     }
                // }
                // });

                $http.get("/proxy/www.ebi.ac.uk/pdbe/static/entry/" + firstStructure + "_json")
                    .success (function (data) {
                        var entryImgs = data[firstStructure].entry.all.image;
                        for (var i=0; i<entryImgs.length; i++) {
                            if (entryImgs[i].filename === (firstStructure + "_deposited_chain_front")) {
                                $scope.pdb.thumbnailUrl = "//www.ebi.ac.uk/pdbe/static/entry/" + entryImgs[i].filename + data.image_suffix[2]; // 400x400 image
                                $scope.pdb.alt = entryImgs[i].alt;
                                //$scope.pdb.description = $sce.trustAsHtml(entryImgs[i].description);
                                return;
                            }
                        }
                    })
                    .error (function (data) {
                        console.log("ERROR FROM PDB:");
                        console.log(data);
                    });
            }
            // Orthologues
            var ensemblApi = tnt.ensembl();
            var orthUrl = ensemblApi.url.homologues({
                id: resp.ensembl_gene_id
            });
            ensemblApi.call(orthUrl)
                .then (function (orthResp) {
                    var data = orthResp.body;
                });
            $scope.targetGeneId = resp.ensembl_gene_id;


            // Pathways
            var pathways = resp.reactome;
            var pathwaysArr = [];
            for (var p in pathways) {
                pathwaysArr.push({
                    "id" : p,
                    "name"   : pathways[p]["pathway name"]
                });
            }
            $scope.pathways = pathwaysArr;

            // Drugs
            var drugs = resp.drugbank;
            $scope.drugs = drugs;

            // Bibliography
            var bibliography = _.filter(resp.dbxrefs, function (t) {return t.match(/^PubMed/);});
            var cleanBibliography = _.map(bibliography, function (t) {return t.substring(7, t.length);});
            var bibliographyStr = cleanBibliography.join (",");
            $scope.pmids = bibliographyStr;
            $scope.pmidsLinks = (_.map(cleanBibliography,function (p) {return "EXT_ID:" + p;})).join(" OR ");

        },
        // error handler
        function(){
        }
    );
}]);