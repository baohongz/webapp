'use strict';


/* Services */

angular.module('cttvServices').



    /**
     * The API services, with methods to call the ElasticSearch API
     */
    factory('cttvDictionary', ['$log', function($log) {

        var dictionary = {

            // A
            AFFECTED_PATHWAY :       "Affected pathways",
            ANIMAL_MODEL :           "Animal models",
            ASSOCIATION_SCORE :      "Association score",

            // B
            // C
            CTTV_PIPELINE :          "CTTV pipeline",

            // D
            DATATYPES :              "Datatypes",

            // E
            ENSEMBL_ID :             "Ensembl ID",

            // F
            // G
            GENETIC_ASSOCIATION :    "Genetic associations",

            // H
            // I
            // J
            // K
            KNOWN_DRUG :             "Known drugs",

            // L
            // M
            MOUSE_MODEL :            "Animal models",

            // N
            NO_DATA :                "No data",
            NA :                     "N/A",

            // O
            // P
            // Q
            // R
            RNA_EXPRESSION:          "RNA expression",

            // S
            SOMATIC_MUTATION :       "Somatic mutations",

            // T

            // U
            UP_OR_DOWN:              "unclassified",

            // V
            // W
            // X
            // Y
            // Z

        };


        dictionary.get = function(w){
            //return en[w] || undefined;
        }


        return dictionary;
    }]);


