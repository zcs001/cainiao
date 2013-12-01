$axure = function(query) {
    return $axure.query(query);
};
 
// ******* AxQuery and Page metadata ******** //
(function() {
    var $ax = function() {
        var returnVal = $axure.apply(this, arguments);
        var axFn = $ax.fn;
        for (var key in axFn) {
            returnVal[key] = axFn[key];
        }

        return returnVal;
    };

    $ax.public = $axure;
    $ax.fn = {};

    $axure.internal = function(initFunction) {
        //Attach messagecenter to $ax object so that it can be used in viewer.js, etc in internal scope
        if(!$ax.messageCenter) $ax.messageCenter = $axure.messageCenter;

        return initFunction($ax);
    };

    window.$obj = function(id) {
        return $ax.getObjectFromElementId(id);
    };

    window.$id = function(obj) {
        return obj.scriptIds[0];
    };

    window.$jobj = function(id) {
        return $('#' + id);
    };

    $ax.INPUT = function(id) {
        return id + "_input";
    };

    var _fn = {};
    $axure.fn = _fn;
    $axure.fn.jQuery = function() {
        var elementIds = this.getElementIds();
        var elementIdSelectors = jQuery.map(elementIds, function(elementId) { return '#' + elementId; });
        var jQuerySelectorText = (elementIds.length > 0) ? elementIdSelectors.join(', ') : '';
        return $(jQuerySelectorText);
    };
    $axure.fn.$ = $axure.fn.jQuery;

    var _query = function(query, queryArg) {
        var returnVal = {};
        var _axQueryObject = returnVal.query = { };
        _axQueryObject.filterFunctions = [];

        if (query == '*') {
            _axQueryObject.filterFunctions[0] = function() { return true; };
        } else if (typeof(query) === 'function') {
            _axQueryObject.filterFunctions[0] = query;
        } else {
            var firstString = $.trim(query.toString());
            if (firstString.charAt(0) == '@') {
                _axQueryObject.filterFunctions[0] = function(diagramObject) {
                    return diagramObject.label == firstString.substring(1);
                };
            } else if (firstString.charAt(0) == '#') {
                _axQueryObject.elementId = firstString.substring(1);
            } else {
                if (firstString == 'label') {
                    _axQueryObject.filterFunctions[0] = function(diagramObject) {
                        return queryArg instanceof Array && queryArg.indexOf(diagramObject.label) > 0 ||
                            queryArg instanceof RegExp && queryArg.test(diagramObject.label) ||
                            diagramObject.label == queryArg;
                    };
                } else if(firstString == 'elementId') {
                    _axQueryObject.filterFunctions[0] = function(diagramObject, elementId) {
                        return queryArg instanceof Array && queryArg.indexOf(elementId) > 0 ||
                            elementId == queryArg;
                    };
                }
            }
        }

        var axureFn = $axure.fn;
        for (var key in axureFn) {
            returnVal[key] = axureFn[key];
        }
        return returnVal;
    };
    $axure.query = _query;

    var _getFilterFnFromQuery = function(query) {
        var filter = function(diagramObject, elementId) {
            var retVal = true;
            for(var i = 0; i < query.filterFunctions.length && retVal; i++) {
                retVal = query.filterFunctions[i](diagramObject, elementId);
            }
            return retVal;
        };
        return filter;
    };

    $ax.public.fn.filter = function(query, queryArg) {
        var returnVal = _query(query, queryArg);
        
        if(this.query.elementId) returnVal.query.elementId = this.query.elementId;
        
        //If there is already a function, offset by 1 when copying other functions over.
        var offset = returnVal.query.filterFunctions[0] ? 1 : 0;
        
        //Copy all functions over to new array.
        for(var i = 0; i < this.query.filterFunctions.length; i++) returnVal.query.filterFunctions[i+offset] = this.query.filterFunctions[i];
        
        //Functions are in reverse order now
        returnVal.query.filterFunctions.reverse();

        return returnVal;
    };

    $ax.public.fn.each = function(fn) {
        var filter = _getFilterFnFromQuery(this.query);
        var elementIds = this.query.elementId ? [this.query.elementId] : $ax.getAllElementIds();
        for (var i = 0; i < elementIds.length; i++) {
            var elementId = elementIds[i];
            var diagramObject = $ax.getObjectFromElementId(elementId);
            if (filter(diagramObject, elementId)) {
                fn.apply(diagramObject, [diagramObject, elementId]);
            }
        }
    };
    
    $ax.public.fn.getElementIds = function() {
        var elementIds = [];
        this.each(function(dObj, elementId) { elementIds[elementIds.length] = elementId; });
        return elementIds;
    };

    // Deep means to keep getting parents parent until at the root parent. Parent is then an array instead of an id.
    $ax.public.fn.getParents = function(deep) {
        var elementIds = this.getElementIds();
        var parentIds = [];

        var getParent = function(elementId) {
            var parent = undefined;
            var scriptId = $ax.repeater.getScriptIdFromElementId(elementId);
            var itemNum = $ax.repeater.getItemIdFromElementId(elementId);
            var parentRepeater = $ax.getParentRepeaterFromScriptId(scriptId);
            // Repeater references self, constantly if it is treated as its own parent in this case infinite recursion occurs.
            if(parentRepeater && parentRepeater != scriptId) {
                parentRepeater = $ax.repeater.createElementId(parentRepeater, itemNum);
                parent = parentRepeater;
            }

            var elementPath = $ax.getPathFromScriptId($ax.repeater.getScriptIdFromElementId(elementId));
            var masterPath = elementPath.splice(0, elementPath.length - 1);
            if(masterPath.length > 0) {
                var masterId = $ax.getElementIdFromPath(masterPath, {itemNum: itemNum});
                var masterRepeater = $ax.getParentRepeaterFromScriptId($ax.repeater.getScriptIdFromElementId(masterId));
                if(!parentRepeater || masterRepeater) parent = masterId;
            }

            var parentDynamicPanel = $obj(elementId).parentDynamicPanel;
            if(parentDynamicPanel) {
                // Make sure the parent if not parentRepeater, or dynamic panel is also in that repeater
                // If there is a parent master, the dynamic panel must be in it, otherwise parentDynamicPanel would be undefined.
                var panelPath = masterPath;
                panelPath[panelPath.length] = parentDynamicPanel;
                var panelId = $ax.getElementIdFromPath(panelPath, {itemNum: itemNum});
                var panelRepeater = $ax.getParentRepeaterFromScriptId($ax.repeater.getScriptIdFromElementId(panelId));
                if(!parentRepeater || panelRepeater) {
                    parent = $ax.visibility.GetPanelState(panelId);
                }
            }

            return parent;
        };

        for(var i = 0; i < elementIds.length; i++) {
            var parent = getParent(elementIds[i]);
            if(deep) {
                var parents = [];
                while(parent) {
                    parents[parents.length] = parent;
                    // If id is not a valid object, you are either repeater item or dynamic panel state.
                    //  Either way, get parents id in that case.
                    if(!$obj(parent)) parent = $jobj(parent).parent().attr('id');
                    parent = getParent(parent);
                }
                parent = parents;
            }
            parentIds[parentIds.length] = parent;
        }
        return parentIds;
    };

    // Get the path to the child, where non leaf nodes can be masters, dynamic panels, and repeaters.
    $ax.public.fn.getChildren = function(deep) {
        var elementIds = this.getElementIds();
        var children = [];

        var getChildren = function(elementId) {
            var obj = $obj(elementId);
            if(!obj) return undefined;

            var isRepeater = obj.type == 'repeater';
            var isDynamicPanel = obj.type == 'dynamicPanel';
            var isMaster = obj.type == 'master';
            if(isRepeater || isDynamicPanel || isMaster) {
                var children = [];
                if(isRepeater) {
                    // TODO: [bf] Probably a faster/better way to do this.
                    var itemIds = $ax.getItemIdsForRepeater(elementId);
                    for(var i = 0; i < itemIds.length; i++) {
                        var itemChildren = $jobj($ax.repeater.createElementId(elementId, itemIds[i])).childern();
                        for(var j = 0; j < itemChildren.length; j++) {
                            var itemChildId = $(itemChildren[j]).attr('id');
                            children[children.length] = itemChildId;
                        }
                    }
                } else if(isDynamicPanel) {
                    var states = $jobj(elementId).children();
                    for(var i = 0; i < states.length; i++) {
                        var stateChildren = $(states[i]).children();
                        for(var j = 0; j < stateChildren.length; j++) {
                            var stateChildId = $(stateChildren[j]).attr('id');
                            children[children.length] = stateChildId;
                        }
                    }
                } else {
                    // Must be master
                    var masterChildren = $jobj(elementId).children();
                    for(var  i= 0; i < masterChildren.length; i++) {
                        var masterChildId = $(masterChildren[i]).attr('id');
                        children[children.length] = masterChildId;
                    }
                }
                
                if(deep) {
                    var childObjs = [];
                    for(var i = 0; i < children.length; i++) {
                        var childId = children[i];
                        childObjs[i] = { id: childId, children: getChildren(childId) };
                    }
                    children = childObjs;
                }
                
                return children;
            }

            return undefined;
        };

        for(var i = 0; i < elementIds.length; i++) {
            children[children.length] = { id : elementIds[i], children : getChildren(elementIds[i])};
        }
        return children;
    };

})();