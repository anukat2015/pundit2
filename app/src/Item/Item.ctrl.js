angular.module('Pundit2.Item')
.controller('ItemCtrl', function($scope, ItemsExchange, TypesHelper, Preview, ContextualMenu) {

    // get item by uri (passed as directive uri param)
    $scope.item = ItemsExchange.getItemByUri($scope.uri);
    // get item type label (then show it inside template)
    $scope.itemTypeLabel = TypesHelper.getLabel($scope.item.type[0]);
    // true when the item is set stcky (used in template to add css class)
    $scope.isStickyItem = false;

    $scope.onItemMouseOver = function(){
        Preview.showDashboardPreview($scope.item);
    };

    $scope.onItemMouseLeave = function(){
        Preview.hideDashboardPreview();
    };

    $scope.onClickSticky = function(){
        if (!$scope.isStickyItem) {
            
            $scope.isStickyItem = true;
            Preview.setItemDashboardSticky($scope.item);

            var unbindWatch = $scope.$watch( function(){
                return Preview.isStickyItem($scope.item);
            }, function(newIsStcky, oldIsStcky){
                if (!newIsStcky && newIsStcky!==oldIsStcky) {
                    $scope.isStickyItem = false;
                    unbindWatch();
                }
            });            
        }
    };
    
    $scope.onClickMenu = function($event){
        // show menu on item, the action is added by MyItemsContainer or PageItemsContainer service
        // the type of menu to show is relative to pageItems or myItems
        ContextualMenu.show($event.pageX, $event.pageY, $scope.item, $scope.menuType);
    };

});