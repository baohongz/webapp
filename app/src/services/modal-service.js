/* Services */

angular.module('otServices')
    .factory('otModal', [function () {
        var modalService = {};

        /* modalService.modalInstance; // the single modal instance?
    modalService.sayHello  = function(){$log.log("hello world")};
    modalService.test = function(){
        $uibModal.open({
            template: '<ot-modal header="I am a test modal" on-ok="$uibModalInstance.sayHello()" hasok="true">'
                            +'<p>And this is the content</p>'
                        +'</ot-modal>',
            size: "sm",
            // controller: ['$uibModalInstance',
            //                 function($uibModalInstance){
            //                     return $uibModalInstance.dismiss(bob);
            //             }]
        });
    }*/

        // open; instance is stored as modalInstance so can always be retrieved (assuming)
        /* modalService.open = function(o){
        if(modalService.modalInstance){
            modalService.modalInstance.close();
        }
        modalService.modalInstance = $uibModal.open(o);
        return modalService.modalInstance;
    }*/


        return modalService;
    }]);
