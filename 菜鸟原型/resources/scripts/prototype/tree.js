// This is actually for BOTH trees and menus
$axure.internal(function($ax) {
    var _tree = $ax.tree = {};
    var _menu = $ax.menu = {};
    
    $ax.menu.InitializeSubmenu = function(subMenuId, cellId) {
        var $submenudiv = $('#' + subMenuId);

        //mouseenter and leave for parent table cell
        $('#' + cellId).mouseenter(function(e) {
            //show current submenu
            $ax.visibility.SetIdVisible(subMenuId, true);
            $ax.legacy.BringToFront(subMenuId);
        }).mouseleave(function(e) {
            var offset = $submenudiv.offset();
            var subcontwidth = $submenudiv.width();
            var subcontheight = $submenudiv.height();
            //If mouse is not within the submenu (added 3 pixel margin to top and left calculations), then close the submenu...
            if(e.pageX + 3 < offset.left || e.pageX > offset.left + subcontwidth || e.pageY + 3 < offset.top || e.pageY > offset.top + subcontheight) {
                $submenudiv.find('.sub_menu').andSelf().each(function() {
                    $ax.visibility.SetVisible(this, false);
                });
                $ax.style.SetWidgetHover(cellId, false);
            }
        });

        //mouseleave for submenu
        $submenudiv.mouseleave(function(e) {
            //close this menu and all menus below it
            $(this).find('.sub_menu').andSelf().css('visibility', 'hidden');
            $ax.style.SetWidgetHover(cellId, false);
        });
    };



    var _getAbsoluteNodeTop = function(node) {
        var currentNode = node;
        var top = 0;
        while(currentNode.tagName != "BODY") {
            top += currentNode.offsetTop;
            currentNode = currentNode.offsetParent;
        }
        return top;
    };

    function IsNodeVisible(nodeId) {
        var current = window.document.getElementById(nodeId);
        var parent = current.parentNode;

        //move all the parent's children that are below the node and their annotations
        while(!$(current).hasClass("treeroot")) {
            if(!$ax.visibility.IsVisible(parent)) return false;
            current = parent;
            parent = parent.parentNode;
        }
        return true;
    }

    $ax.tree.ExpandNode = function(nodeId, childContainerId, plusMinusId) {
        var container = window.document.getElementById(childContainerId);
        if($ax.visibility.IsVisible(container)) return;
        $ax.visibility.SetVisible(container, true);

        if(plusMinusId != '') $ax.style.SetWidgetSelected(plusMinusId, true);

        var delta = _getExpandCollapseDelta(nodeId, childContainerId);

        var isVisible = IsNodeVisible(nodeId);
        var current = window.document.getElementById(nodeId);
        var parent = current.parentNode;

        //move all the parent's children that are below the node and their annotations
        while(!$(current).hasClass("treeroot")) {
            var after = false;
            var i = 0;
            for(i = 0; i < parent.childNodes.length; i++) {
                var child = parent.childNodes[i];
                if(after && child.id && $(child).hasClass("treenode")) {
                    var elementId = child.id;
                    child.style.top = Number($(child).css('top').replace("px", "")) + delta + 'px';
                    var ann = window.document.getElementById(elementId + "_ann");
                    if(ann) ann.style.top = Number($(ann).css('top').replace("px", "")) + delta + 'px';
                }
                if(child == current) after = true;
            }
            current = parent;
            parent = parent.parentNode;
            if(!isVisible && !$ax.visibility.IsVisible(parent)) break;
        }
    };

    $ax.tree.CollapseNode = function(nodeId, childContainerId, plusMinusId) {
        var container = window.document.getElementById(childContainerId);
        if(!$ax.visibility.IsVisible(container)) return;

        if(plusMinusId != '') $ax.style.SetWidgetSelected(plusMinusId, false);

        var delta = _getExpandCollapseDelta(nodeId, childContainerId);

        //hide it after getting the delta, otherwise the delta can't be calculated (offsetParent is null)
        $ax.visibility.SetVisible(container, false);

        var isVisible = IsNodeVisible(nodeId);
        var current = window.document.getElementById(nodeId);
        var parent = current.parentNode;

        //move all the parent's children that are below the node and their annotations
        while(!$(current).hasClass("treeroot")) {
            var after = false;
            var i = 0;
            for(i = 0; i < parent.childNodes.length; i++) {
                var child = parent.childNodes[i];
                if(after && child.id && $(child).hasClass("treenode")) {
                    var elementId = child.id;
                    child.style.top = Number($(child).css('top').replace("px", "")) - delta + 'px';
                    var ann = window.document.getElementById(elementId + "_ann");
                    if(ann) ann.style.top = Number($(ann).css('top').replace("px", "")) - delta + 'px';
                }
                if(child == current) after = true;
            }
            current = parent;
            parent = current.parentNode;
            if(!isVisible && !$ax.visibility.IsVisible(parent)) break;
        }
    };

    var _getExpandCollapseDelta = function(nodeId, childContainerId) {
        //find the distance by diffing the bottom of the node to the bottom of the last child
        var node = window.document.getElementById(nodeId);
        var lastNode = _getLastVisibleChild(childContainerId);

        var nodetop = _getAbsoluteNodeTop(node);
        var nodebottom = nodetop + Number(node.style.height.replace("px", ""));
        var lastNodeTop = _getAbsoluteNodeTop(lastNode);
        var lastNodeBottom = lastNodeTop + Number(lastNode.style.height.replace("px", ""));
        var delta = lastNodeBottom - nodebottom;
        return delta;
    };

    var _getLastVisibleChild = function(containerId) {
        var container = window.document.getElementById(containerId);

        //get the last node that's not an annotation
        var lastNode = container.lastChild;
        while(!lastNode.id || !$(lastNode).hasClass("treenode")) {
            lastNode = lastNode.previousSibling;
        }
        var lastNodeId = lastNode.id;

        //see if it has a visible container for child nodes
        var subContainer = window.document.getElementById(lastNodeId + '_children');
        if(subContainer && $ax.visibility.IsVisible(subContainer)) {
            return _getLastVisibleChild(subContainer.id);
        }

        return lastNode;
    };


    var initializedTreeNodes = {};

    $ax.tree.InitializeTreeNode = function(nodeId, plusminusid, childContainerId, selectText) {
        if(initializedTreeNodes[nodeId]) return;

        var childContainer = window.document.getElementById(childContainerId);
        if(childContainer) {
            var isCollapsed = $jobj(plusminusid).children().first().attr('src').indexOf('selected') == -1;
            if(isCollapsed) $ax.visibility.SetVisible(childContainer, false);
        }

        $jobj(plusminusid).click(function() {
            var visibleSet = $ax.visibility.IsIdVisible(childContainerId);

            if(visibleSet) $ax.tree.CollapseNode(nodeId, childContainerId, plusminusid);
            else $ax.tree.ExpandNode(nodeId, childContainerId, plusminusid);
            $ax.tree.SelectTreeNode(nodeId);

            return false;
        }).css('cursor', 'default');

        initializedTreeNodes[nodeId] = true;
    };

    var _getButtonShapeId = function(id) {
        var obj = $obj(id);
        return obj.type == 'treeNodeObject' ? $ax.getElementIdFromPath([obj.buttonShapeId], { relativeTo: id }) : id;
    };

    $ax.tree.SelectTreeNode = function(id) {
        $ax.style.SetWidgetSelected(_getButtonShapeId(id), true);
    };

});