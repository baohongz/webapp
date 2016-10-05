if (typeof tnt === "undefined") {
    module.exports = tnt = {};
}
tnt.board = require("tnt.genome");
tnt.utils = require("tnt.utils");
tnt.tooltip = require("tnt.tooltip");
//tnt.ensembl = require("tnt.ensembl");
tnt.rest = require("tnt.rest");

var targetGenomeBrowser = require("cttv.genome");
// var bubblesView = require("cttv.bubblesView");
// var geneAssociations = require("cttv.targetAssociations");
var targetAssociations = require("cttv.targetAssociationsBubbles"); // new bubbles view
var geneAssociationsTree = require("cttv.targetAssociationsTree");
var flowerView = require("cttv.flowerView");

var spinner = require("cttv.spinner");

var diseaseGraph = require("cttv.diseaseGraph");
var targetGeneTree = require("cttv.targetGeneTree");
var cttvApi = require("cttv.api");
// var cttvDiseaseRelations = require("viz_diseases");
