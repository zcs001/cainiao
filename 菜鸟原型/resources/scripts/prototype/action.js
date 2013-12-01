﻿$axure.internal(function($ax) {
    var _actionHandlers = {};
    var _action = $ax.action = {};

    var _repeatersToRefeash = _action.repeatersToRefresh = [];

    var animationQueue = {};
    var getAnimation = function(id) {
        return animationQueue[id] && animationQueue[id][0];
    };

    var _addAnimation = _action.addAnimation = function(id, func) {
        var wasEmpty = !getAnimation(id);

        // Add the func to the queue. Create the queue if necessary.
        var queue = animationQueue[id];
        if(!queue) {
            animationQueue[id] = queue = [];
        }
        queue[queue.length] = func;

        // If it was empty, there isn't a callback waiting to be called on this. You have to fire it manually.
        if(wasEmpty) func();
    };

    var _fireAnimationFromQueue = _action.fireAnimationFromQueue = function(id) {
        // Remove the function that was just fired
        animationQueue[id].splice(0, 1);

        // Fire the next func if there is one
        var func = getAnimation(id);
        if(func) func();
    };

    var _dispatchAction = $ax.action.dispatchAction = function(eventInfo, actions, currentIndex) {
        currentIndex = currentIndex || 0;
        //If no actions, you can bubble
        if(currentIndex >= actions.length) return;
        //actions are responsible for doing their own dispatching
        _actionHandlers[actions[currentIndex].action](eventInfo, actions, currentIndex);
    };

    _actionHandlers.wait = function(eventInfo, actions, index) {
        var action = actions[index];
        window.setTimeout(function() {
            _dispatchAction(eventInfo, actions, index + 1);
        }, action.waitTime);
    };

    _actionHandlers.expr = function(eventInfo, actions, index) {
        var action = actions[index];

        $ax.expr.evaluateExpr(action.expr, eventInfo); //this should be a block

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.setFunction = _actionHandlers.expr;

    _actionHandlers.linkWindow = function(eventInfo, actions, index) {
        linkActionHelper(eventInfo, actions, index);
    };

    _actionHandlers.closeCurrent = function(eventInfo, actions, index) {
        $ax.closeWindow();
        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.linkFrame = function(eventInfo, actions, index) {
        linkActionHelper(eventInfo, actions, index);
    };

    var linkActionHelper = function(eventInfo, actions, index) {
        var action = actions[index];

        if(action.linkType != 'frame') {
            if(action.target.targetType == "reloadPage") {
                $ax.reload(action.target.includeVariables);
            } else if(action.target.targetType == "backUrl") {
                $ax.back();
            }

            var url = action.target.url;
            if(!url && action.target.urlLiteral) {
                url = $ax.expr.evaluateExpr(action.target.urlLiteral, eventInfo, true);
            }

            if(url) {
                if(action.linkType == "popup") {
                    $ax.navigate({
                        url: url,
                        target: action.linkType,
                        includeVariables: action.target.includeVariables,
                        popupOptions: action.popup
                    });
                } else {
                    $ax.navigate({
                        url: url,
                        target: action.linkType,
                        includeVariables: action.target.includeVariables
                    });
                }
            }
        } else linkFrame(eventInfo, action);

        _dispatchAction(eventInfo, actions, index + 1);
    };

    var linkFrame = function(eventInfo, action) {
        for(var i = 0; i < action.framesToTargets.length; i++) {
            var framePath = action.framesToTargets[i].framePath;
            var target = action.framesToTargets[i].target;

            var url = target.url;
            if(!url && target.urlLiteral) {
                url = $ax.expr.evaluateExpr(target.urlLiteral, eventInfo, true);
            }

            $ax('#' + $ax.getElementIdsFromPath(framePath, eventInfo)[0]).openLink(url, target.includeVariables);
        }
    };

    _actionHandlers.setPanelState = function(eventInfo, actions, index) {
        var action = actions[index];

        for(var i = 0; i < action.panelsToStates.length; i++) {
            var panelToState = action.panelsToStates[i];
            var stateInfo = panelToState.stateInfo;
            var elementIds = $ax.getElementIdsFromPath(panelToState.panelPath, eventInfo);

            for(var j = 0; j < elementIds.length; j++) {
                var elementId = elementIds[j];
                // Need new scope for elementId and info
                (function(elementId, stateInfo) {
                    _addAnimation(elementId, function() {
                        var stateNumber = stateInfo.stateNumber;
                        if(stateInfo.setStateType == "value") {
                            var stateName = $ax.expr.evaluateExpr(stateInfo.stateValue, eventInfo);
                            stateNumber = Number(stateName);
                            var panelCount = $('#' + elementId).children().length;
                            // If not number, or too low or high, try to get it as a name rather than id
                            if(isNaN(stateNumber) || stateNumber <= 0 || stateNumber > panelCount) {
                                var states = $ax.getObjectFromElementId(elementId).diagrams;
                                var stateNameFound = false;
                                for(var k = 0; k < states.length; k++) {
                                    if(states[k].label == stateName) {
                                        stateNumber = k + 1;
                                        stateNameFound = true;
                                    }
                                }
                                // Wasn't a state number, or a state name, so return
                                if(!stateNameFound) return $ax.action.fireAnimationFromQueue(elementId);
                            }
                        } else {
                            var currentStateId = $ax.visibility.GetPanelState(elementId);
                            if(currentStateId != '') {
                                currentStateId = $ax.repeater.getScriptIdFromElementId(currentStateId);
                                var currentStateNumber = Number(currentStateId.substr(currentStateId.indexOf('state') + 5));
                                if(stateInfo.setStateType == "next") {
                                    stateNumber = currentStateNumber + 2;
                                    if(stateNumber > $('#' + elementId).children().length) {
                                        if(stateInfo.loop) stateNumber = 1;
                                        else return $ax.action.fireAnimationFromQueue(elementId);
                                    }
                                } else if(stateInfo.setStateType == "previous") {
                                    stateNumber = currentStateNumber;
                                    if(stateNumber <= 0) {
                                        if(stateInfo.loop) stateNumber = $('#' + elementId).children().length;
                                        else return $ax.action.fireAnimationFromQueue(elementId);
                                    }
                                }
                            }
                        }

                        $ax('#' + elementId).SetPanelState(stateNumber, stateInfo.options, stateInfo.showWhenSet, eventInfo);
                        $ax.dynamicPanelManager.fitParentPanel(elementId);
                    });
                })(elementId, stateInfo);
            }
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.fadeWidget = function(eventInfo, actions, index) {
        var action = actions[index];

        for(var i = 0; i < action.objectsToFades.length; i++) {
            var fadeInfo = action.objectsToFades[i].fadeInfo;
            var elementIds = $ax.getElementIdsFromPath(action.objectsToFades[i].objectPath, eventInfo);

            for(var j = 0; j < elementIds.length; j++) {
                var elementId = elementIds[j];
                // Need new scope for elementId and info
                (function(elementId, fadeInfo) {
                    _addAnimation(elementId, function() {
                        if(fadeInfo.fadeType == "hide") {
                            $ax('#' + elementId).hide(fadeInfo.options);
                        } else if(fadeInfo.fadeType == "show") {
                            $ax('#' + elementId).show(fadeInfo.options, eventInfo);
                        } else if(fadeInfo.fadeType == "toggle") {
                            $ax('#' + elementId).toggleVisibility(fadeInfo.options);
                        }
                    });
                })(elementId, fadeInfo);
            }
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.moveWidget = function(eventInfo, actions, index) {
        var action = actions[index];
        for(var i = 0; i < action.objectsToMoves.length; i++) {
            var moveInfo = action.objectsToMoves[i].moveInfo;
            var elementIds = $ax.getElementIdsFromPath(action.objectsToMoves[i].objectPath, eventInfo);

            for(var j = 0; j < elementIds.length; j++) {
                var elementId = elementIds[j];
                // Need new scope for elementId and info
                (function(elementId, moveInfo) {
                    var xValue = $ax.expr.evaluateExpr(moveInfo.xValue, eventInfo);
                    var yValue = $ax.expr.evaluateExpr(moveInfo.yValue, eventInfo);

                    var widgetDragInfo = $ax.drag.GetWidgetDragInfo();
                    _addAnimation(elementId, function() {
                        if(moveInfo.moveType == "location") {
                            $ax('#' + elementId).moveTo(xValue, yValue, moveInfo.options);
                        } else if(moveInfo.moveType == "delta") {
                            $ax('#' + elementId).moveBy(xValue, yValue, moveInfo.options);
                        } else if(moveInfo.moveType == "drag") {
                            $ax('#' + elementId).moveBy(widgetDragInfo.xDelta, widgetDragInfo.yDelta, moveInfo.options);
                        } else if(moveInfo.moveType == "dragX") {
                            $ax('#' + elementId).moveBy(widgetDragInfo.xDelta, 0, moveInfo.options);
                        } else if(moveInfo.moveType == "dragY") {
                            $ax('#' + elementId).moveBy(0, widgetDragInfo.yDelta, moveInfo.options);
                        } else if(moveInfo.moveType == "locationBeforeDrag") {
                            var loc = widgetDragInfo.movedWidgets[elementId];
                            if(loc) $ax('#' + elementId).moveTo(loc.x, loc.y, moveInfo.options);
                        } else if(moveInfo.moveType == "withThis") {
                            var widgetMoveInfo = $ax.move.GetWidgetMoveInfo();
                            var srcElementId = $ax.getElementIdsFromEventAndScriptId(eventInfo, eventInfo.srcElement)[0];
                            var delta = widgetMoveInfo[srcElementId];
                            if(delta) $ax('#' + elementId).moveBy(delta.x, delta.y, delta.options);
                        }

                        $ax.dynamicPanelManager.fitParentPanel(elementId);
                    });
                })(elementId, moveInfo);
            }
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.setWidgetSize = function(eventInfo, actions, index) {
        var action = actions[index];
        for(var i = 0; i < action.objectsToResize.length; i++) {
            var resizeInfo = action.objectsToResize[i].sizeInfo;
            var elementIds = $ax.getElementIdsFromPath(action.objectsToResize[i].objectPath, eventInfo);

            for(var j = 0; j < elementIds.length; j++) {
                var elementId = elementIds[j];

                // Need new scope for elementId and info
                (function(elementId, resizeInfo) {
                    var width = $ax.expr.evaluateExpr(resizeInfo.width, eventInfo);
                    var height = $ax.expr.evaluateExpr(resizeInfo.height, eventInfo);
                    // TODO:[bf] Does this merit it's own file? Is there another file it should be refactored out to? Just refactored out to another function?
                    _addAnimation(elementId, function() {
                        var query = $jobj(elementId);

                        // Get the current width and height
                        var oldWidth = query.css('width');
                        oldWidth = Number(oldWidth && oldWidth.substring(0, oldWidth.length - 2));
                        var oldHeight = query.css('height');
                        oldHeight = Number(oldHeight && oldHeight.substring(0, oldHeight.length - 2));

                        // If either one is not a number, use the old value
                        width = width != "" ? Number(width) : oldWidth;
                        height = height != "" ? Number(height) : oldHeight;

                        width = isNaN(width) ? oldWidth : width;
                        height = isNaN(height) ? oldHeight : height;

                        // can't be negative
                        width = Math.max(width, 0);
                        height = Math.max(height, 0);
                        if(height == oldHeight && width == oldWidth) {
                            _fireAnimationFromQueue(elementId);
                            return;
                        }

                        var css = { width: width, height: height };
                        var obj = $obj(elementId);
                        // No longer fitToContent, calculate additional styling that needs to be done.
                        if(obj.fitToContent) {
                            var panelCss = { width: oldWidth, height: oldHeight };
                            var stateCss = { width: oldWidth, height: oldHeight };

                            panelCss.overflow = 'hidden';
                            stateCss.position = 'absolute';
                            var scrollbars = $obj(elementId).scrollbars;
                            if(scrollbars != 'none') {
                                stateCss.overflow = 'auto';
                                stateCss['-webkit-overflow-scrolling'] = 'touch';
                            }
                            if(scrollbars == 'verticalAsNeeded') {
                                stateCss['overflow-x'] = 'hidden';
                                stateCss['-ms-overflow-x'] = 'hidden';
                            } else if(scrollbars == 'horizontalAsNeeded') {
                                stateCss['overflow-y'] = 'hidden';
                                stateCss['-ms-overflow-y'] = 'hidden';
                            }

                            query.css(panelCss);
                            query.children().css(stateCss);

                            obj.fitToContent = false;
                        }

                        var easing = resizeInfo.easing || 'none';
                        var duration = resizeInfo.duration || 0;

                        var stateCss = $ax.deepCopy(css);
                        // This will move panel if fixed. The callback will make sure resizing ends there.
                        if((obj.fixedHorizontal && obj.fixedHorizontal == 'center') || (obj.fixedVertical && obj.fixedVertical == 'middle')) {
                            var loc = $ax.dynamicPanelManager.getFixedPosition(elementId, oldWidth, oldHeight, width, height);
                            if(loc) {
                                if(loc[0] != 0) css['margin-left'] = '+=' + loc[0];
                                if(loc[1] != 0) css['margin-top'] = '+=' + loc[1];
                            }
                        }

                        // This does the resize animation. Moving is handled elsewhere.
                        if(easing == 'none') {
                            query.animate(css, 0);
                            query.children().animate(css, 0);
                            _fireAnimationFromQueue(elementId);
                        } else {
                            query.children().animate(stateCss, duration, easing);
                            query.animate(css, duration, easing, function() {
                                _fireAnimationFromQueue(elementId);
                            });
                        }

                        $ax.event.raiseSyntheticEvent(elementId, 'onResize');
                        $ax.flyoutManager.updateFlyout(elementId);

                        $ax.dynamicPanelManager.fitParentPanel(elementId);
                    });
                })(elementId, resizeInfo);
            }
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.setPanelOrder = function(eventInfo, actions, index) {
        var action = actions[index];
        for(var i = 0; i < action.panelPaths.length; i++) {
            var func = action.panelPaths[i].setOrderInfo.bringToFront ? 'bringToFront' : 'sendToBack';
            var elementIds = $ax.getElementIdsFromPath(action.panelPaths[i].panelPath, eventInfo);
            for(var j = 0; j < elementIds.length; j++) $ax('#' + elementIds[j])[func]();
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.modifyDataSetEditItems = function(eventInfo, actions, index) {
        var action = actions[index];
        var add = action.repeatersToAddTo;
        var repeaters = add || action.repeatersToRemoveFrom;
        var itemId;
        for(var i = 0; i < repeaters.length; i++) {
            var data = repeaters[i];
            // Grab the first one because repeaters must have only element id, as they cannot be inside repeaters
            var id = $ax.getElementIdsFromPath(data.path, eventInfo)[0];

            if(data.isThis) {
                var scriptId = $ax.repeater.getScriptIdFromElementId(eventInfo.srcElement);
                itemId = $ax.repeater.getItemIdFromElementId(eventInfo.srcElement);
                var repeaterId = $ax.getParentRepeaterFromScriptId(scriptId);
                if(add) $ax.repeater.addEditItems(repeaterId, [itemId]);
                else $ax.repeater.removeEditItems(repeaterId, [itemId]);
            } else {
                var itemEventInfo = $ax.deepCopy(eventInfo);
                itemEventInfo.repeaterIdOverride = id;
                var itemIds = $ax.getItemIdsForRepeater(id);
                var itemIdsToAdd = [];
                for(var j = 0; j < itemIds.length; j++) {
                    itemId = itemIds[j];
                    itemEventInfo.itemIdOverride = itemId;
                    if($ax.expr.evaluateExpr(data.query, itemEventInfo) == "true") {
                        itemIdsToAdd[itemIdsToAdd.length] = String(itemId);
                    }
                }
                if(add) $ax.repeater.addEditItems(id, itemIdsToAdd);
                else $ax.repeater.removeEditItems(id, itemIdsToAdd);
            }
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.addItemsToDataSet = function(eventInfo, actions, index) {
        var action = actions[index];
        for(var i = 0; i < action.dataSetsToAddTo.length; i++) {
            var datasetInfo = action.dataSetsToAddTo[i];
            // Grab the first one because repeaters must have only element id, as they cannot be inside repeaters
            var id = $ax.getElementIdsFromPath(datasetInfo.path, eventInfo)[0];
            var dataset = datasetInfo.data;

            for(var j = 0; j < dataset.length; j++) $ax.repeater.addItem(id, $ax.deepCopy(dataset[j]), eventInfo);
            if(dataset.length && _repeatersToRefeash.indexOf(id) == -1) _repeatersToRefeash.push(id);
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.deleteEditItemsFromDataSet = function(eventInfo, actions, index) {
        var action = actions[index];
        for(var i = 0; i < action.dataSetEditItemsToRemove.length; i++) {
            // Grab the first one because repeaters must have only element id, as they cannot be inside repeaters
            var id = $ax.getElementIdsFromPath(action.dataSetEditItemsToRemove[i], eventInfo)[0];
            $ax.repeater.deleteEditItems(id);
            if(_repeatersToRefeash.indexOf(id) == -1) _repeatersToRefeash.push(id);
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.updateEditItemsInDataSet = function(eventInfo, actions, index) {
        var action = actions[index];
        for(var i = 0; i < action.dataSetsToUpdate.length; i++) {
            var dataSet = action.dataSetsToUpdate[i];
            // Grab the first one because repeaters must have only element id, as they cannot be inside repeaters
            var id = $ax.getElementIdsFromPath(dataSet.path, eventInfo)[0];

            $ax.repeater.updateEditItems(id, dataSet.props, eventInfo);
            if(_repeatersToRefeash.indexOf(id) == -1) _repeatersToRefeash.push(id);
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.setRepeaterToDataSet = function(eventInfo, actions, index) {
        var action = actions[index];

        for(var i = 0; i < action.repeatersToSet.length; i++) {
            var setRepeaterInfo = action.repeatersToSet[i];
            // Grab the first one because repeaters must have only element id, as they cannot be inside repeaters
            var id = $ax.getElementIdsFromPath(setRepeaterInfo.path, eventInfo)[0];
            $ax.repeater.setDataSet(id, setRepeaterInfo.localDataSetId);
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.addFilterToRepeater = function(eventInfo, actions, index) {
        var action = actions[index];

        for(var i = 0; i < action.repeatersToAddFilter.length; i++) {
            var addFilterInfo = action.repeatersToAddFilter[i];
            // Grab the first one because repeaters must have only element id, as they cannot be inside repeaters
            var id = $ax.getElementIdsFromPath(addFilterInfo.path, eventInfo)[0];

            $ax.repeater.addFilter(id, addFilterInfo.label, addFilterInfo.filter);
            if(_repeatersToRefeash.indexOf(id) == -1) _repeatersToRefeash.push(id);
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.removeFilterFromRepeater = function(eventInfo, actions, index) {
        var action = actions[index];

        for(var i = 0; i < action.repeatersToRemoveFilter.length; i++) {
            var removeFilterInfo = action.repeatersToRemoveFilter[i];
            // Grab the first one because repeaters must have only element id, as they cannot be inside repeaters
            var id = $ax.getElementIdsFromPath(removeFilterInfo.path, eventInfo)[0];

            if(removeFilterInfo.removeAll) $ax.repeater.removeFilter(id);
            else if(removeFilterInfo.filterName != '') {
                $ax.repeater.removeFilter(id, removeFilterInfo.filterName);
            }
            if(_repeatersToRefeash.indexOf(id) == -1) _repeatersToRefeash.push(id);
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.addSortToRepeater = function(eventInfo, actions, index) {
        var action = actions[index];

        for(var i = 0; i < action.repeatersToAddSort.length; i++) {
            var addSortInfo = action.repeatersToAddSort[i];
            // Grab the first one because repeaters must have only element id, as they cannot be inside repeaters
            var id = $ax.getElementIdsFromPath(addSortInfo.path, eventInfo)[0];

            $ax.repeater.addSort(id, addSortInfo.label, addSortInfo.columnName, addSortInfo.ascending, addSortInfo.toggle, addSortInfo.sortType);
            if(_repeatersToRefeash.indexOf(id) == -1) _repeatersToRefeash.push(id);
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.removeSortFromRepeater = function(eventInfo, actions, index) {
        var action = actions[index];

        for(var i = 0; i < action.repeatersToRemoveSort.length; i++) {
            var removeSortInfo = action.repeatersToRemoveSort[i];
            // Grab the first one because repeaters must have only element id, as they cannot be inside repeaters
            var id = $ax.getElementIdsFromPath(removeSortInfo.path, eventInfo)[0];

            if(removeSortInfo.removeAll) $ax.repeater.removeSort(id);
            else if(removeSortInfo.sortName != '') $ax.repeater.removeSort(id, removeSortInfo.sortName);
            if(_repeatersToRefeash.indexOf(id) == -1) _repeatersToRefeash.push(id);
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.setRepeaterToPage = function(eventInfo, actions, index) {
        var action = actions[index];

        for(var i = 0; i < action.repeatersToSetPage.length; i++) {
            var setPageInfo = action.repeatersToSetPage[i];
            // Grab the first one because repeaters must have only element id, as they cannot be inside repeaters
            var id = $ax.getElementIdsFromPath(setPageInfo.path, eventInfo)[0];

            var eventCopy = $ax.deepCopy(eventInfo);
            eventCopy.repeaterIdOverride = id;
            $ax.repeater.setRepeaterToPage(id, setPageInfo.pageType, setPageInfo.pageValue, eventCopy);
            if(_repeatersToRefeash.indexOf(id) == -1) _repeatersToRefeash.push(id);
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.setItemsPerRepeaterPage = function(eventInfo, actions, index) {
        var action = actions[index];

        for(var i = 0; i < action.repeatersToSetItemCount.length; i++) {
            var setItemCountInfo = action.repeatersToSetItemCount[i];
            // Grab the first one because repeaters must have only element id, as they cannot be inside repeaters
            var id = $ax.getElementIdsFromPath(setItemCountInfo.path, eventInfo)[0];

            var eventCopy = $ax.deepCopy(eventInfo);
            if(setItemCountInfo.noLimit) $ax.repeater.setNoItemLimit(id);
            else $ax.repeater.setItemLimit(id, setItemCountInfo.itemCountValue, eventCopy);
            if(_repeatersToRefeash.indexOf(id) == -1) _repeatersToRefeash.push(id);
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.refreshRepeater = function(eventInfo, actions, index) {
        // This should not be doing anything right now. We refresh automatically
        //        var action = actions[index];
        //        for(var i = 0; i < action.repeatersToRefresh.length; i++) {
        //            $ax.repeater.refreshRepeater(action.repeatersToRefresh[i], eventInfo);
        //        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.scrollToWidget = function(eventInfo, actions, index) {
        var action = actions[index];
        var elementIds = $ax.getElementIdsFromPath(action.objectPath, eventInfo);
        if(elementIds.length > 0) $ax('#' + elementIds[0]).scroll(action.options);

        _dispatchAction(eventInfo, actions, index + 1);
    };


    _actionHandlers.enableDisableWidgets = function(eventInfo, actions, index) {
        var action = actions[index];
        for(var i = 0; i < action.pathToInfo.length; i++) {
            var elementIds = $ax.getElementIdsFromPath(action.pathToInfo[i].objectPath, eventInfo);
            var enable = action.pathToInfo[i].enableDisableInfo.enable;
            for(var j = 0; j < elementIds.length; j++) $ax('#' + elementIds[j]).enabled(enable);
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    var _elementIdsToImageOverrides = {};
    _actionHandlers.setImage = function(eventInfo, actions, index) {
        var action = actions[index];
        for(var i = 0; i < action.imagesToSet.length; i++) {
            var imgInfo = action.imagesToSet[i].setImageInfo;
            var evaluatedImgs = _evaluateImages(imgInfo, eventInfo);
            var elementIds = $ax.getElementIdsFromPath(action.imagesToSet[i].objectPath, eventInfo);

            for(var j = 0; j < elementIds.length; j++) {
                var elementId = elementIds[j];

                var img = evaluatedImgs.normal;
                if($ax.style.IsWidgetDisabled(elementId)) {
                    if(imgInfo.disabled) img = evaluatedImgs.disabled;
                } else if($ax.style.IsWidgetSelected(elementId)) {
                    if(imgInfo.selected) img = evaluatedImgs.selected;
                } else if($ax.event.mouseDownObjectId == elementId && imgInfo.mouseDown) img = evaluatedImgs.mouseDown;
                else if($ax.event.mouseOverIds.indexOf(elementId) != -1 && imgInfo.mouseOver) {
                    img = evaluatedImgs.mouseOver;
                    //Update mouseOverObjectId
                    var currIndex = $ax.event.mouseOverIds.indexOf($ax.event.mouseOverObjectId);
                    var imgIndex = $ax.event.mouseOverIds.indexOf(elementId);
                    if(currIndex < imgIndex) $ax.event.mouseOverObjectId = elementId;
                }

                //            $('#' + $ax.repeater.applySuffixToElementId(elementId, '_img')).attr('src', img);
                $jobj($ax.style.GetImageIdFromShape(elementId)).attr('src', img);

                //Set up overrides
                $ax.style.mapElementIdToImageOverrides(elementId, evaluatedImgs);
            }
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    var _evaluateImages = function(imgInfo, eventInfo) {
        var retVal = {};
        for(var state in imgInfo) {
            if(!imgInfo.hasOwnProperty(state)) continue;
            var img = imgInfo[state].path || $ax.expr.evaluateExpr(imgInfo[state].literal, eventInfo);
            if(!img) img = 'resources/images/transparent.gif';
            retVal[state] = img;
        }
        return retVal;
    };

    $ax.clearRepeaterImageOverrides = function(repeaterId) {
        var childIds = $ax.getChildElementIdsForRepeater(repeaterId);
        for(var i = childIds; i < childIds.length; i++) $ax.style.deleteElementIdToImageOverride(childIds[i]);
    };

    _actionHandlers.setFocusOnWidget = function(eventInfo, actions, index) {
        var action = actions[index];
        if(action.objectPaths.length > 0) {
            var elementIds = $ax.getElementIdsFromPath(action.objectPaths[0], eventInfo);
            if(elementIds.length > 0) $ax('#' + elementIds[0]).focus();
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.expandCollapseTree = function(eventInfo, actions, index) {
        var action = actions[index];
        for(var i = 0; i < action.pathToInfo.length; i++) {
            var pair = action.pathToInfo[i];
            var elementIds = $ax.getElementIdsFromPath(pair.treeNodePath, eventInfo);
            for(var j = 0; j < elementIds.length; j++) $ax('#' + elementIds[j]).expanded(pair.expandCollapseInfo.expand);
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.other = function(eventInfo, actions, index) {
        var action = actions[index];
        $ax.navigate({
            url: "resources/Other.html#other=" + encodeURI(action.description),
            target: "popup",
            includeVariables: false,
            popupOptions: action.popup
        });

        _dispatchAction(eventInfo, actions, index + 1);
    };

    _actionHandlers.raiseEvent = function(eventInfo, actions, index) {
        var action = actions[index];
        //look for the nearest element id

        if(eventInfo.srcElement) {
            var objId = eventInfo.srcElement;
            var obj = $ax.getObjectFromElementId(objId);
            var rdoId = $ax.getRdoParentFromElementId(objId);
            var rdo = $ax.getObjectFromElementId(rdoId);

            // Check if rdo should be this
            var oldIsMasterEvent = eventInfo.isMasterEvent;
            if(obj.type == 'referenceDiagramObject' && eventInfo.isMasterEvent) {
                rdoId = objId;
                rdo = obj;
                // It is now an rdo event
                eventInfo.isMasterEvent = false;
            }

            for(var i = 0; i < action.raisedEvents.length; i++) {
                var raisedEvent = action.raisedEvents[i];
                var oldRaisedId = eventInfo.raisedId;
                var event = rdo.interactionMap && rdo.interactionMap && rdo.interactionMap.raised[raisedEvent];

                // raised event will optimize away if it doesn't do anything. Whole interaction map may be optimized away as well.
                if(event) {
                    var oldSrc = eventInfo.srcElement;
                    eventInfo.srcElement = rdoId;
                    eventInfo.raisedId = rdoId;
                    $ax.event.handleEvent(rdoId, eventInfo, event, false, true);
                    eventInfo.raisedId = oldRaisedId;
                    eventInfo.srcElement = oldSrc;
                }
            }
            eventInfo.isMasterEvent = oldIsMasterEvent;
        }

        _dispatchAction(eventInfo, actions, index + 1);
    };
});