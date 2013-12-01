﻿// ******* Features MANAGER ******** //

$axure.internal(function($ax) {
    var _features = $ax.features = {};
    var _supports = _features.supports = {};
    _supports.touchstart = typeof window.ontouchstart !== 'undefined';
    _supports.touchmove = typeof window.ontouchmove !== 'undefined';
    _supports.touchend = typeof window.ontouchend !== 'undefined';

    _supports.mobile = _supports.touchstart && _supports.touchend && _supports.touchmove;
    // Got this from http://stackoverflow.com/questions/11381673/javascript-solution-to-detect-mobile-browser
    var check = navigator.userAgent.match(/Android/i)
        || navigator.userAgent.match(/webOS/i)
        || navigator.userAgent.match(/iPhone/i)
        || navigator.userAgent.match(/iPad/i)
        || navigator.userAgent.match(/iPod/i)
        || navigator.userAgent.match(/BlackBerry/i)
        || navigator.userAgent.match(/Windows Phone/i);

    if(!check && _supports.mobile) {
        _supports.touchstart = false;
        _supports.touchmove = false;
        _supports.touchend = false;
        _supports.mobile = false;
    }

    var _eventNames = _features.eventNames = {};
    _eventNames.mouseDownName = _supports.touchstart ? 'touchstart' : 'mousedown';
    _eventNames.mouseUpName = _supports.touchend ? 'touchend' : 'mouseup';
    _eventNames.mouseMoveName = _supports.touchmove ? 'touchmove' : 'mousemove';
});

// ******* EVENT MANAGER ******** //
$axure.internal(function($ax) {
    var _objectIdToEventHandlers = {};

    $ax.getEvent = function() {
        return typeof event == "undefined" ? undefined : event;
    };

    var _event = {};
    $ax.event = _event;

    //initilize state
    _event.mouseOverObjectId = '';
    _event.mouseDownObjectId = '';
    _event.mouseOverIds = [];

    var EVENT_NAMES = ['mouseover', 'mouseleave', 'contextmenu', 'change', 'focus', 'blur'];


    // Tap, double tap, and touch move, or synthetic.
    if(!$ax.features.supports.mobile) {
        EVENT_NAMES[EVENT_NAMES.length] = 'click';
        EVENT_NAMES[EVENT_NAMES.length] = 'dblclick';
        EVENT_NAMES[EVENT_NAMES.length] = 'mousemove';
    }

    // add the event names for the touch events
    EVENT_NAMES[EVENT_NAMES.length] = $ax.features.eventNames.mouseDownName;
    EVENT_NAMES[EVENT_NAMES.length] = $ax.features.eventNames.mouseUpName;

    for(var i = 0; i < EVENT_NAMES.length; i++) {
        var eventName = EVENT_NAMES[i];
        //we need the function here to circumvent closure modifying eventName
        _event[eventName] = (function(event) {
            return function(elementId, fn) {
                var elementIdQuery = $jobj(elementId);
                var type = $ax.getTypeFromElementId(elementId);

                //we need specially track link events so we can enable and disable them along with
                //their parent widgets
                if(elementIdQuery.is('a')) _attachCustomObjectEvent(elementId, event, fn);
                //see notes below
                else if(type == 'treeNodeObject') _attachTreeNodeEvent(elementId, event, fn);
                else if(type == 'buttonShape' && (event == 'focus' || event == 'blur')) _attachDefaultObjectEvent($jobj($ax.repeater.applySuffixToElementId(elementId, '_img')), elementId, event, fn);
                else _attachDefaultObjectEvent(elementIdQuery, elementId, event, fn);
            };
        })(eventName);
    }


    var AXURE_TO_JQUERY_EVENT_NAMES = {
        'onMouseOver': 'mouseover',
        'onMouseOut': 'mouseleave',
        'onContextMenu': 'contextmenu',
        'onChange': 'change',
        'onFocus': 'focus',
        'onLostFocus': 'blur'
    };

    // Tap, double tap, and touch move, or synthetic.
    if(!$ax.features.supports.mobile) {
        AXURE_TO_JQUERY_EVENT_NAMES.onClick = 'click';
        AXURE_TO_JQUERY_EVENT_NAMES.onDoubleClick = 'dblclick';
        AXURE_TO_JQUERY_EVENT_NAMES.onMouseMove = 'mousemove';
    }

    AXURE_TO_JQUERY_EVENT_NAMES.onMouseDown = $ax.features.eventNames.mouseDownName;
    AXURE_TO_JQUERY_EVENT_NAMES.onMouseUp = $ax.features.eventNames.mouseUpName;

    var _attachEvents = function(diagramObject, elementId) {
        for(var eventName in diagramObject.interactionMap) {
            var jQueryEventName = AXURE_TO_JQUERY_EVENT_NAMES[eventName];
            if(!jQueryEventName) continue;

            _event[jQueryEventName](elementId,
            //this is needed to escape closure
                (function(axEventObject) {
                    return function(event) {
                        _handleEvent(elementId, $ax.getEventInfoFromEvent(event, false, elementId), axEventObject);
                    };
                })(diagramObject.interactionMap[eventName])
            );
        }

    };

    var _initilizeEventHandlers = function(query) {
        query.filter(function(diagramObject) {
            return diagramObject.interactionMap;
        }).each(_attachEvents);
    };

    var preventDefaultEvents = ['OnContextMenu', 'OnKeyUp', 'OnKeyDown'];

    var _handleEvent = $ax.event.handleEvent = function(elementId, eventInfo, axEventObject, skipShowDescriptions, synthetic) {
        var eventDescription = axEventObject.description;
        // If you are supposed to suppress, do that right away.
        if(suppressedEventStatus[eventDescription]) {
            return;
        }

        if(typeof event != 'undefined' && event && event.handled) return;
        if(!synthetic && elementId && !$ax.style.getObjVisible(elementId)) return;

        if(eventDescription == 'OnMouseMove') _updateMouseLocation({ 'pageX': eventInfo.x, 'pageY': eventInfo.y });

        var bubble = true;
        if(skipShowDescriptions || !_shouldShowCaseDescriptions(axEventObject)) {
            //handle case descriptions
            var caseGroups = [];
            var currentCaseGroup = [];
            caseGroups[0] = currentCaseGroup;
            for(var i = 0; i < axEventObject.cases.length; i++) {
                var currentCase = axEventObject.cases[i];
                if(currentCase.isNewIfGroup) {
                    currentCaseGroup = [];
                    caseGroups[caseGroups.length] = currentCaseGroup;
                }
                currentCaseGroup[currentCaseGroup.length] = currentCase;
            }

            for(var i = 0; i < caseGroups.length; i++) {
                bubble = _handleCaseGroup(eventInfo, caseGroups[i]) && bubble;
            }
        } else {
            _showCaseDescriptions(elementId, eventInfo, axEventObject, synthetic);
            bubble = false;
        }

        // Only trigger a supression if it handled this event
        if(!bubble && suppressingEvents[eventDescription]) {
            suppressedEventStatus[suppressingEvents[eventDescription]] = true;
        }
        var repeaters = $ax.deepCopy($ax.action.repeatersToRefresh);
        $ax.action.repeatersToRefresh.splice(0, repeaters.length);
        for(i = 0; i < repeaters.length; i++) $ax.repeater.refreshRepeater(repeaters[i], eventInfo);

        // checking type first for ie
        var event = $ax.getEvent();
        if(event) {
            event.handled = !synthetic && !bubble && axEventObject.description != 'OnFocus';

            // Prevent default if necessary
            if(event.handled && preventDefaultEvents.indexOf(eventDescription) != -1) event.preventDefault();
        }
    };

    var _showCaseDescriptions = function(elementId, eventInfo, axEventObject, synthetic) {

        if(axEventObject.cases.length == 0) return true;

        var linksId = elementId + "linkBox";
        $('#' + linksId).remove();

        var $container = $("<div class='intcases' id='" + linksId + "'></div>");

        if(!_isEventSimulating(axEventObject)) {
            for(var i = 0; i < axEventObject.cases.length; i++) {
                var $link = $("<div class='intcaselink' onmouseleave='$ax.legacy.SuppressBubble(event)'>" + axEventObject.cases[i].description + "</div>");
                $link.click(function(j) {
                    return function() {
                        var bubble = $ax.action.dispatchAction(eventInfo, axEventObject.cases[j].actions);
                        $('#' + linksId).remove();
                        return bubble;
                    };
                } (i)
                );

                $container.append($link);
            }
        } else {
            var fullDescription = axEventObject.description + ":<br>";
            for(var i = 0; i < axEventObject.cases.length; i++) {
                var currentCase = axEventObject.cases[i];
                fullDescription += "&nbsp;&nbsp;" + currentCase.description.replace(/<br>/g, '<br>&nbsp;&nbsp;') + ":<br>";
                for(var j = 0; j < currentCase.actions.length; j++) {
                    fullDescription += "&nbsp;&nbsp;&nbsp;&nbsp;" + currentCase.actions[j].description.replace(/<br>/g, '<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;') + "<br>";
                }
            }
            fullDescription = fullDescription.substring(0, fullDescription.length - 4);

            var $link = $("<div class='intcaselink' onmouseleave='$ax.legacy.SuppressBubble(event)'>" + fullDescription + "</div>");
            $link.click(function() {
                _handleEvent(elementId, eventInfo, axEventObject, true, synthetic);
                $('#' + linksId).remove();
                return;
            });
            $container.append($link);
        }

        $('body').append($container);
        _showCaseLinks(eventInfo, linksId);
    };

    var _showCaseLinks = function(eventInfo, linksId) {
        var links = window.document.getElementById(linksId);

        links.style.top = eventInfo.pageY;
        links.style.left = eventInfo.pageX;
        $ax.visibility.SetVisible(links, true);
        $ax.legacy.BringToFront(linksId, true);
        $ax.legacy.RefreshScreen();
    };


    var _shouldShowCaseDescriptions = function(axEventObject) {
        if($ax.document.configuration.linkStyle == "alwaysDisplayTargets") return true;
        if($ax.document.configuration.linkStyle == "neverDisplayTargets") return false;
        if(axEventObject.cases.length == 0) return false;
        for(var i = 0; i < axEventObject.cases.length; i++) {
            if(axEventObject.cases[i].condition) return false;
        }
        if(axEventObject.cases.length >= 2) return true;
        return false;
    };

    var _isEventSimulating = function(axEventObject) {
        for(var i = 0; i < axEventObject.cases.length; i++) {
            if(axEventObject.cases[i].condition) return true;
        }
        return false;
    };

    var _handleCaseGroup = function(eventInfo, caseGroup) {
        for(var i = 0; i < caseGroup.length; i++) {
            var currentCase = caseGroup[i];
            if(!currentCase.condition || _processCondition(currentCase.condition, eventInfo)) {

                $ax.action.dispatchAction(eventInfo, currentCase.actions);
                return false;
            }
        }
        return true;
    };

    var _processCondition = function(expr, eventInfo) {
        return $ax.expr.evaluateExpr(expr, eventInfo);
    };

    var _attachTreeNodeEvent = function(elementId, eventName, fn) {
        //we need to set the cursor here because we want to make sure that every tree node has the default
        //cursor set and then it's overridden if it has a click
        if(eventName == 'click') window.document.getElementById(elementId).style.cursor = 'pointer';

        _attachCustomObjectEvent(elementId, eventName, fn);
    };

    var _attachDefaultObjectEvent = function(elementIdQuery, elementId, eventName, fn) {
        var func = function() {
            if(!$ax.style.IsWidgetDisabled(elementId)) return fn.apply(this, arguments);
            return true;
        };

        var bind = !elementIdQuery[eventName];
        if(bind) elementIdQuery.bind(eventName, func);
        else elementIdQuery[eventName](func);
    };

    var _attachCustomObjectEvent = function(elementId, eventName, fn) {
        var handlers = _objectIdToEventHandlers[elementId];
        if(!handlers) _objectIdToEventHandlers[elementId] = handlers = {};

        var fnList = handlers[eventName];
        if(!fnList) handlers[eventName] = fnList = [];

        fnList[fnList.length] = fn;
    };

    var _fireObjectEvent = function(elementId, event, originalArgs) {
        var element = window.document.getElementById(elementId);

        var handlerList = _objectIdToEventHandlers[elementId] && _objectIdToEventHandlers[elementId][event];
        if(handlerList) {
            for(var i = 0; i < handlerList.length; i++) handlerList[i].apply(element, originalArgs);
        }
    };

    //for button shapes and images the img is focusable instead of the div to get better outlines

    $ax.event.getFocusableWidgetOrChildId = function(elementId) {
        var imgId = $ax.repeater.applySuffixToElementId(elementId, '_img');
        var imgQuery = $jobj(imgId);

        var inputId = $ax.repeater.applySuffixToElementId(elementId, '_input');
        var inputQuery = $jobj(inputId);

        return imgQuery.length > 0 ? imgId : inputQuery.length > 0 ? inputId : elementId;
    };

    // key is the suppressing event, and the value is the event that is supressed
    var suppressingEvents = {};
    // key is the event that will cancel the suppression, and value is the event that was being suppressed
    var cancelSuppressions = {};
    // suppressed event maps to true if it is supressed
    var suppressedEventStatus = {};

    // Attempt at a generic way to supress events
    var initSuppressingEvents = function(query) {
        suppressingEvents['OnLongClick'] = 'OnClick';
        cancelSuppressions['OnMouseDown'] = 'OnClick';

        // Have to cancel suppressed event here. Only works for non-synthetic events currently
        for(var key in cancelSuppressions) {
            var eventName = AXURE_TO_JQUERY_EVENT_NAMES[key];
            if(!eventName) continue;
            (function(eventName, suppressed) {
                query.bind(eventName, function() {
                    suppressedEventStatus[suppressed] = false;
                });
            })(eventName, cancelSuppressions[key]);
        }

        // Otherwise see if you have the chance to cancel a supression
        //        if(cancelSuppressions[eventDescription]) {
        //            suppressedEventStatus[cancelSuppressions[eventDescription]] = false;
        //        }
    };

    // TODO: It may be a good idea to split this into multiple functions, or at least pull out more similar functions into private methods
    var _initializeObjectEvents = function(query) {
        // Must init the supressing eventing before the handlers, so that it has the ability to supress those events.
        initSuppressingEvents(query);
        _initilizeEventHandlers(query);

        //attach button shape alternate styles
        var mouseFilter = query.filter(function(obj) {
            return obj.type != 'hyperlink' && obj.type != 'dynamicPanel' && obj.type != 'richTextPanel' &&
                obj.type != 'repeater' && obj.type != 'checkbox' && obj.type != 'radioButton';
        });
        mouseFilter.mouseover(function() {
            var elementId = this.id;
            var parent = $ax.dynamicPanelManager.parentHandlesStyles(elementId);
            if(parent) {
                dynamicPanelMouseOver(parent.id);
                if(parent.direct) return;
            }
            if($.inArray(elementId, _event.mouseOverIds) != -1) return;
            _event.mouseOverIds[_event.mouseOverIds.length] = elementId;

            if(elementId == _event.mouseOverObjectId) return;
            _event.mouseOverObjectId = elementId;
            $ax.style.SetWidgetHover(elementId, true);
            var textId = $ax.style.GetTextIdFromShape(elementId);
            if(textId) $ax.annotation.updateLinkLocations(textId);
        }).mouseleave(function() {
            var elementId = this.id;
            var parent = $ax.dynamicPanelManager.parentHandlesStyles(elementId);
            if(parent) {
                dynamicPanelMouseLeave(parent.id);
                if(parent.direct) return;
            }
            _event.mouseOverIds.splice($.inArray(elementId, _event.mouseOverIds), 1);

            if(elementId == _event.mouseOverObjectId) {
                _event.mouseOverObjectId = '';
            }
            $ax.style.SetWidgetHover(elementId, false);
            var textId = $ax.style.GetTextIdFromShape(elementId);
            if(textId) $ax.annotation.updateLinkLocations(textId);
        });

        mouseFilter.bind($ax.features.eventNames.mouseDownName, function() {
            var elementId = this.id;
            var parent = $ax.dynamicPanelManager.parentHandlesStyles(elementId);
            if(parent) {
                dynamicPanelMouseDown(parent.id);
                if(parent.direct) return;
            }
            _event.mouseDownObjectId = elementId;

            $ax.style.SetWidgetMouseDown(this.id, true);
            $ax.annotation.updateLinkLocations($ax.style.GetTextIdFromShape(elementId));
        }).bind($ax.features.eventNames.mouseUpName, function() {
            var elementId = this.id;
            var parent = $ax.dynamicPanelManager.parentHandlesStyles(elementId);
            if(parent) {
                dynamicPanelMouseUp(parent.id);
                if(parent.direct) return;
            }
            var mouseDownId = _event.mouseDownObjectId;
            _event.mouseDownObjectId = '';
            if(!$ax.style.ObjHasMouseDown(elementId)) return;

            $ax.style.SetWidgetMouseDown(elementId, false);
            $ax.annotation.updateLinkLocations($ax.style.GetTextIdFromShape(elementId));

            //there used to be something we needed to make images click, because swapping out the images prevents the click
            // this is a note that we can eventually delete.
        });

        // Initialize selected elements
        query.filter(function(obj) {
            return (obj.type == 'buttonShape' || obj.type == 'imageBox' || obj.type == 'dynamicPanel') && obj.selected;
        }).selected(true);

        //initialize disabled elements
        query.filter(function(obj) {
            return (obj.type == 'buttonShape' || obj.type == 'imageBox' || obj.type == 'dynamicPanel') && obj.disabled;
        }).enabled(false);

        // Initialize Placeholders. Right now this is text boxes and text areas.
        // Also, the assuption is being made that these widgets with the placeholder, have no other styles (this may change...)
        query.filter(function(obj) {
            var hasPlaceholder = obj.placeholderText == '' ? true : Boolean(obj.placeholderText);
            return (obj.type == 'textArea' || obj.type == 'textBox') && hasPlaceholder;
        }).bind('focus', function() {
            var elementId = this.id;
            if(!$ax.placeholderManager.isActive(elementId)) return;
            $ax.placeholderManager.updatePlaceholder(elementId, false, true);
        }).bind('blur', function() {
            var elementId = this.id;
            if($jobj(elementId).val()) return;
            $ax.placeholderManager.updatePlaceholder(elementId, true);
        }).each(function(diagramObject, elementId) {
            // This is needed to initialize the placeholder state
            $ax.placeholderManager.registerPlaceholder(elementId, diagramObject.placeholderText, $jobj(elementId).attr('type') == 'password');
            $ax.placeholderManager.updatePlaceholder(elementId, !($jobj(elementId).val()));
        });

        //initialize tree node cursors to default so they will override their parent
        query.filter(function(obj) {
            return obj.type == 'treeNodeObject' && !(obj.interactionMap && obj.interactionMap.onClick);
        }).each(function(obj, id) {
            $jobj(id).css('cursor', 'default');
        });

        //initialize widgets that are clickable to have the pointer over them when hovering
        query.filter(function(obj) {
            return obj.interactionMap && obj.interactionMap.onClick;
        }).each(function(obj, id) {
            var jobj = $jobj(id);
            if(jobj) jobj.css('cursor', 'pointer');
        });

        // TODO: not sure if we need this. It appears to be working without
        //initialize panels for DynamicPanels
        query.filter(function(obj) {
            return (obj.type == 'dynamicPanel');
        }).$().children().each(function() {
            var parts = this.id.split('_');
            var state = parts[parts.length - 1].substring(5);
            if(state != 0) $ax.visibility.SetVisible(this, false);
        });

        //initialize TreeNodes
        query.filter(function(obj) {
            return (obj.type == 'treeNodeObject');
        }).each(function(otehnutohe, id) {
            //var id = ids[index];
            var obj = $jobj(id);
            if(obj.hasClass('treeroot')) return;

            var childrenId = id + '_children';
            var children = obj.children('[id="' + childrenId + '"]:first');
            if(children.length > 0) {
                var plusMinusId = 'u' + (parseInt($ax.repeater.getScriptIdFromElementId(id).substring(1)) + 1);
                var itemId = $ax.repeater.getItemIdFromElementId(id);
                if(itemId) plusMinusId = $ax.repeater.createElementId(plusMinusId, itemId);
                $ax.tree.InitializeTreeNode(id, plusMinusId, childrenId);
            }
            obj.click(function() { $ax.tree.SelectTreeNode(id); });
        });

        //initialize submenus
        query.filter(function(obj) {
            return (obj.type == 'menuObject');
        }).each(function(obj, elementId) {
            var jobj = $jobj(elementId);
            if(jobj.hasClass('sub_menu')) {
                var tableCellScriptId = $ax.getElementIdFromPath([obj.parentCellId], {relativeTo:elementId});
                $ax.menu.InitializeSubmenu(elementId, tableCellScriptId);
            }
        });


        // Attach handles for dynamic panels that propagate styles to inner items.
        query.filter(function(obj) {
            return obj.type == 'dynamicPanel' && obj.propagate;
        }).mouseover(function() {
            var elementId = this.id;
            dynamicPanelMouseOver(elementId);
        }).mouseleave(function() {
            var elementId = this.id;
            dynamicPanelMouseLeave(elementId);
        }).bind($ax.features.eventNames.mouseDownName, function() {
            var elementId = this.id;
            dynamicPanelMouseDown(elementId);
        }).bind($ax.features.eventNames.mouseUpName, function() {
            var elementId = this.id;
            dynamicPanelMouseUp(elementId);
        });

        // These are the dynamic panel functions for propagating rollover styles and mouse down styles to inner objects
        var dynamicPanelMouseOver = function(elementId, fromChild) {
            var parent = $ax.dynamicPanelManager.parentHandlesStyles(elementId);
            if(parent) {
                dynamicPanelMouseOver(parent.id, true);
                if(parent.direct) return;
            }
            if($.inArray(elementId, _event.mouseOverIds) != -1) return;
            // If this event is coming from a child, don't mark that it's actually entered.
            // Only mark that this has been entered if this event has naturally been triggered. (For reason see mouseleave)
            if(!fromChild) _event.mouseOverIds[_event.mouseOverIds.length] = elementId;
            if(elementId == _event.mouseOverObjectId) return;
            _event.mouseOverObjectId = elementId;
            $ax.dynamicPanelManager.propagateMouseOver(elementId, true);
        };
        var dynamicPanelMouseLeave = function(elementId, fromChild) {
            var parent = $ax.dynamicPanelManager.parentHandlesStyles(elementId);
            if(parent) {
                dynamicPanelMouseLeave(parent.id, true);
                if(parent.direct) return;
            }
            var index = $.inArray(elementId, _event.mouseOverIds);
            // If index != -1, this has been natuarally entered. If naturally entered, then leaving child should not trigger leaving,
            //  but instead wait for natural mouse leave. If natural mouse enter never triggered, natural mouse leave won't so do this now.
            if((index != -1) && fromChild) return;
            _event.mouseOverIds.splice(index, 1);

            if(elementId == _event.mouseOverObjectId) {
                _event.mouseOverObjectId = '';
            }
            $ax.dynamicPanelManager.propagateMouseOver(elementId, false);
        };
        var dynamicPanelMouseDown = function(elementId) {
            var parent = $ax.dynamicPanelManager.parentHandlesStyles(elementId);
            if(parent) {
                dynamicPanelMouseDown(parent.id);
                if(parent.direct) return;
            }
            _event.mouseDownObjectId = elementId;
            $ax.dynamicPanelManager.propagateMouseDown(elementId, true);
        };
        var dynamicPanelMouseUp = function(elementId) {
            var parent = $ax.dynamicPanelManager.parentHandlesStyles(elementId);
            if(parent) {
                dynamicPanelMouseUp(parent.id);
                if(parent.direct) return;
            }
            _event.mouseDownObjectId = '';
            $ax.dynamicPanelManager.propagateMouseDown(elementId, false);
        };

        //attach handlers for button shape and tree node mouse over styles
        // TODO: Can this really be removed? Trees seem to work with out (the generic hover case works for it).
        //        query.filter(function(obj) {
        //            return obj.type == 'buttonShape' && obj.parent.type == 'treeNodeObject' &&
        //                    obj.parent.style && obj.parent.style.stateStyles &&
        //                        obj.parent.style.stateStyles.mouseOver;
        //        }).mouseover(function() {
        //            $ax.style.SetWidgetHover(this.id, true);
        //        }).mouseleave(function() {
        //            $ax.style.SetWidgetHover(this.id, false);
        //        });

        //handle treeNodeObject events and prevent them from bubbling up. this is necessary because otherwise
        //both a sub menu and it's parent would get a click
        query.filter(function(obj) {
            return obj.type == 'treeNodeObject';
        }).click(function() {
            //todo -- this was bubbling, but then selecting a child tree node would bubble and select the parent (don't know if there is a better way)
            _fireObjectEvent(this.id, 'click', arguments);
            return false;
        }).$().each(function() {
            if(!this.style.cursor) {
                this.style.cursor = 'default';
            }
        });

        // Synthetic events

        // Attach dynamic panel synthetic drag and swipe events
        query.filter(function(diagramObject) {
            if(diagramObject.type != "dynamicPanel") return false;
            var map = diagramObject.interactionMap;
            return map && (
                map.onDragStart || map.onDrag ||
                    map.onDragDrop || map.onSwipeLeft || map.onSwipeRight);
        }).each(function(diagramObject, elementId) {
            $('#' + elementId)
                .bind($ax.features.eventNames.mouseDownName, function(e) { $ax.drag.StartDragWidget(e.originalEvent, elementId); });
        });

        // Attach dynamic panel synthetic scroll event
        query.filter(function(diagramObject) {
            if(diagramObject.type != 'dynamicPanel') return false;
            var map = diagramObject.interactionMap;
            return map && map.onScroll;
        }).each(function(diagramObject, elementId) {
            var diagrams = diagramObject.diagrams;
            for(var i = 0; i < diagrams.length; i++) {
                var panelId = $ax.repeater.applySuffixToElementId(elementId, '_state' + i);
                (function(id) {
                    _attachDefaultObjectEvent($('#' + id), elementId, 'scroll', function(event) {
                        _handleEvent(elementId, $ax.getEventInfoFromEvent(event, false, elementId), diagramObject.interactionMap.onScroll);
                    });
                })(panelId);
            }
        });

        // Attach synthetic hover event
        query.filter(function(diagramObject) {
            var map = diagramObject.interactionMap;
            return map && map.onMouseHover;
        }).each(function(diagramObject, elementId) {
            var MIN_HOLD_TIME = 1000;

            // So when the timeout fires, you know whether it is the same mouseover that is active or not.
            var mouseCount = 0;
            // Update eventInfo regularly, so position is accurate.
            var eventInfo;

            $('#' + elementId).mouseover(function() {
                eventInfo = $ax.getEventInfoFromEvent(event, false, elementId);
                (function(currCount) {
                    window.setTimeout(function() {
                        if(currCount == mouseCount) _raiseSyntheticEvent(elementId, 'onMouseHover', false, eventInfo);
                    }, MIN_HOLD_TIME);
                })(mouseCount);
            }).mouseleave(function() {
                mouseCount++;
            }).mousemove(function() {
                eventInfo = $ax.getEventInfoFromEvent($ax.getEvent(), false, elementId);
            });
        });

        // Attach synthetic tap and hold event.
        query.filter(function(diagramObject) {
            var map = diagramObject.interactionMap;
            return map && map.onLongClick;
        }).each(function(diagramObject, elementId) {
            var MIN_HOLD_TIME = 750;

            // So when the timeout fires, you know whether it is the same mousedown that is active or not.
            var mouseCount = 0;

            $('#' + elementId).bind($ax.features.eventNames.mouseDownName, function(e) {
                (function(currCount) {
                    var eventInfo = $ax.getEventInfoFromEvent($ax.getEvent(), false, elementId);
                    window.setTimeout(function() {
                        if(currCount == mouseCount) _raiseSyntheticEvent(elementId, 'onLongClick', false, eventInfo);
                    }, MIN_HOLD_TIME);
                    if(e.preventDefault) e.preventDefault();
                })(mouseCount);
            }).bind($ax.features.eventNames.mouseUpName, function() {
                mouseCount++;
            });
        });

        // Attach synthetic onSelectionChange event to droplist and listbox elements
        query.filter(function(diagramObject) {
            return $ax.event.HasSelectionChanged(diagramObject);
        }).each(function(diagramObject, elementId) {
            $('#' + elementId).bind('change', function() { _raiseSyntheticEvent(elementId, 'onSelectionChange'); });
        });

        // Highjack key up and key down to keep track of state of keyboard.
        _event.initKeyEvents(function(initKeydown) {
            query.filter('*').each(function(diagramObject, elementId) {
                initKeydown('#' + elementId, elementId);
            });
        }, function(initKeyup) {
            query.filter('*').each(function(diagramObject, elementId) {
                initKeyup('#' + elementId, elementId);
            });
        });

        // Attach synthetic onTextChange event to textbox and textarea elements
        query.filter(function(diagramObject) {
            return $ax.event.HasTextChanged(diagramObject);
        }).each(function(diagramObject, elementId) {
            var element = $('#' + elementId);
            $ax.updateElementText(elementId, element.val());
            //Key down needed because when holding a key down, key up only fires once, but keydown fires repeatedly.
            //Key up because last mouse down will only show the state before the last character.
            element.bind('keydown', function() { $ax.event.TryFireTextChanged(elementId); })
                .bind('keyup', function() { $ax.event.TryFireTextChanged(elementId); });
        });

        // Attach synthetic onCheckedChange event to radiobutton and checkbox elements
        query.filter(function(diagramObject) {
            return $ax.event.HasCheckedChanged(diagramObject);
        }).each(function(diagramObject, elementId) {
            $('#' + elementId).bind('change', function() { _tryFireCheckedChanged(elementId); });
        });

        // Mobile events
        _event.initMobileEvents(function(initTap) {
            query.filter(function(diagramObject) {
                var map = diagramObject.interactionMap;
                return map && (map.onClick || map.onDoubleClick);
            }).each(function(diagramObject, elementId) {
                initTap('#' + elementId, elementId);
            });
        }, function(initMove) {
            query.filter(function(diagramObject) {
                var map = diagramObject.interactionMap;
                return map && map.onMouseMove;
            }).each(function(diagramObject, elementId) {
                initMove('#' + elementId, elementId);
            });
        });

        //attach link alternate styles
        query.filter(function(obj) {
            return obj.type == 'hyperlink';
        }).mouseover(function() {
            var elementId = this.id;
            if(_event.mouseOverIds.indexOf(elementId) != -1) return true;
            _event.mouseOverIds[_event.mouseOverIds.length] = elementId;
            var mouseOverObjectId = _event.mouseOverObjectId;
            if(mouseOverObjectId && $ax.style.IsWidgetDisabled(mouseOverObjectId)) return true;

            $ax.style.SetLinkHover(elementId);

            var bubble = _fireObjectEvent(elementId, 'mouseover', arguments);

            $ax.annotation.updateLinkLocations($ax.style.GetTextIdFromLink(elementId));
            return bubble;
        }).mouseleave(function() {
            var elementId = this.id;
            _event.mouseOverIds.splice(_event.mouseOverIds.indexOf(elementId), 1);
            var mouseOverObjectId = _event.mouseOverObjectId;
            if(mouseOverObjectId && $ax.style.IsWidgetDisabled(mouseOverObjectId)) return true;

            $ax.style.SetLinkNotHover(elementId);

            var bubble = _fireObjectEvent(elementId, 'mouseleave', arguments);

            $ax.annotation.updateLinkLocations($ax.style.GetTextIdFromLink(elementId));
            return bubble;
        }).bind($ax.features.eventNames.mouseDownName, function() {
            var elementId = this.id;
            var mouseOverObjectId = _event.mouseOverObjectId;
            if($ax.style.IsWidgetDisabled(mouseOverObjectId)) return undefined;

            if(mouseOverObjectId) $ax.style.SetWidgetMouseDown(mouseOverObjectId, true);
            $ax.style.SetLinkMouseDown(elementId);

            $ax.annotation.updateLinkLocations($ax.style.GetTextIdFromLink(elementId));

            return false;
        }).bind($ax.features.eventNames.mouseUpName, function() {
            var elementId = this.id;
            var mouseOverObjectId = _event.mouseOverObjectId;
            if(mouseOverObjectId && $ax.style.IsWidgetDisabled(mouseOverObjectId)) return;

            if(mouseOverObjectId) $ax.style.SetWidgetMouseDown(mouseOverObjectId, false);
            $ax.style.SetLinkNotMouseDown(elementId);

            $ax.annotation.updateLinkLocations($ax.style.GetTextIdFromLink(elementId));

        }).click(function() {
            var elementId = this.id;
            var mouseOverObjectId = _event.mouseOverObjectId;
            if(mouseOverObjectId && $ax.style.IsWidgetDisabled(mouseOverObjectId)) return undefined;

            return _fireObjectEvent(elementId, 'click', arguments);
        });
    };
    $ax.initializeObjectEvents = _initializeObjectEvents;

    // Handle key up and key down events
    (function() {
        var _keyState = {};
        _keyState.ctrl = false;
        _keyState.alt = false;
        _keyState.shift = false;
        _keyState.keyCode = 0;
        $ax.event.keyState = function() {
            return $ax.deepCopy(_keyState);
        };

        $ax.event.initKeyEvents = function(handleKeydown, handleKeyup) {
            handleKeydown(function(query, elementId) {
                $(query).keydown(function(e) {
                    var modDown = e.ctrlKey && !_keyState.ctrl;
                    _keyState.ctrl = e.ctrlKey;

                    modDown |= (e.altKey && !_keyState.alt);
                    _keyState.alt = e.altKey;

                    modDown |= (e.shiftKey && !_keyState.shift);
                    _keyState.shift = e.shiftKey;

                    // If a modifier was pressed, then don't set the keyCode;
                    if(!modDown) _keyState.keyCode = e.keyCode;

                    _raiseSyntheticEvent(elementId, 'onKeyDown', false, undefined, true);
                });
            });
            handleKeyup(function(query, elementId) {
                $(query).keyup(function(e) {
                    // Fire event before updating modifiers.
                    _raiseSyntheticEvent(elementId, 'onKeyUp', false, undefined, true);

                    var modUp = _keyState.ctrl && !e.ctrlKey;
                    _keyState.ctrl = e.ctrlKey;

                    modUp |= (_keyState.alt && !e.altKey);
                    _keyState.alt = e.altKey;

                    modUp |= (_keyState.shift && !e.shiftKey);
                    _keyState.shift = e.shiftKey;

                    // If a modifier was lifted, clear the keycode
                    if(modUp) _keyState.keyCode = 0;
                });
            });
        };
    })();

    // Handle adding mobile events
    (function() {
        // NOTE: Multi touch is NOT handled currently.
        var CLICK_THRESHOLD_PX = 25;
        var CLICK_THRESHOLD_PX_SQ = CLICK_THRESHOLD_PX * CLICK_THRESHOLD_PX;
        var DBLCLICK_THRESHOLD_MS = 500;

        // Location in page cooridinates
        var tapDownLoc;
        var fastClick;
        var lastEvent;

        _event.initMobileEvents = function(handleTap, handleMove) {
            if(!$ax.features.supports.mobile) return;

            // Handle touch start
            handleTap(function(query, elementId) {
                $(query).bind('touchstart', function(e) {
                    // We do NOT support multiple touches. This isn't necessarily the touch we want.
                    var touch = e.originalEvent && e.originalEvent.changedTouches && e.originalEvent.changedTouches[0];
                    if(!touch) return;

                    tapDownLoc = [touch.pageX, touch.pageY];

                    var time = (new Date()).getTime();

                    if(fastClick) {
                        // If second click was too slow, prevent it being interpreted as a double click
                        if(time - lastEvent >= DBLCLICK_THRESHOLD_MS) fastClick = false;
                        // Prevent zoom
                        else e.preventDefault();
                    }
                    lastEvent = time;
                    //                    var attributes = '';
                    //                    for(var key in e.originalEvent) attributes += key + ', ';
                    //                    $('#u0').text(attributes);
                });

                $(query).bind('touchend', function(e) {
                    var touch = e.originalEvent && e.originalEvent.changedTouches && e.originalEvent.changedTouches[0];
                    if(!touch) return;

                    var tapUpLoc = [touch.pageX, touch.pageY];
                    var xDiff = tapUpLoc[0] - tapDownLoc[0];
                    var yDiff = tapUpLoc[1] - tapDownLoc[1];

                    if((xDiff * xDiff + yDiff * yDiff) < CLICK_THRESHOLD_PX_SQ) {
                        _raiseSyntheticEvent(elementId, 'onClick', false, undefined, true);

                        var time = (new Date()).getTime();
                        if(time - lastEvent < DBLCLICK_THRESHOLD_MS) {
                            if(fastClick) _raiseSyntheticEvent(elementId, 'onDoubleClick', false, undefined, true);
                            fastClick = !fastClick;
                        }
                        lastEvent = time;
                    }
                });
            });

            // Handles touch move
            handleMove(function(query, elementId) {
                $(query).bind('touchmove', function(e) {
                    _raiseSyntheticEvent(elementId, 'onMouseMove', false, undefined, true);
                    if(event.handled) e.preventDefault();
                });
            });
        };
    })();

    var _mouseLocation = $ax.mouseLocation = { x: 0, y: 0 };
    var _updateMouseLocation = function(e, end) {
        if(e.type != 'mousemove' && e.type != 'touchstart' && e.type != 'touchmove' && e.type != 'touchend') return;
        if($.browser.msie) {
            _mouseLocation.x = e.clientX + $('body').scrollLeft();
            _mouseLocation.y = e.clientY + $('body').scrollTop();
        } else {
            _mouseLocation.x = e.pageX;
            _mouseLocation.y = e.pageY;
        }
        $ax.geometry.tick(_mouseLocation.x, _mouseLocation.y, end);
    };
    _event.updateMouseLocation = _updateMouseLocation;

    var _raiseSyntheticEvent = function(elementId, eventName, skipShowDescription, eventInfo, nonSynthetic) {
        // Empty string used when this is an event directly on the page.
        var dObj = elementId === '' ? $ax.pageData.page : $ax.getObjectFromElementId(elementId);
        var axEventObject = dObj && dObj.interactionMap && dObj.interactionMap[eventName];
        if(!axEventObject) return;

        eventInfo = eventInfo || $ax.getEventInfoFromEvent($ax.getEvent(), skipShowDescription, elementId);
        _handleEvent(elementId, eventInfo, axEventObject, false, !nonSynthetic);
    };
    $ax.event.raiseSyntheticEvent = _raiseSyntheticEvent;

    var _hasSyntheticEvent = function(scriptId, eventName) {
        var dObj = $ax.getObjectFromScriptId(scriptId);
        var axEventObject = dObj && dObj.interactionMap && dObj.interactionMap[eventName];
        return Boolean(axEventObject);
    };
    $ax.event.hasSyntheticEvent = _hasSyntheticEvent;

    var _initialize = function() {
        $ax.repeater.load();

        // Make sure key events for page are initialized first. That way they will update the value of key pressed before any other events occur.
        _event.initKeyEvents(function(initKeydown) { initKeydown(window, ''); }, function(initKeyup) { initKeyup(window, ''); });
        _initializeObjectEvents($ax('*'));

        //finally, process the pageload
        _pageLoad();
        //        _loadDynamicPanelsAndMasters();
        //        $ax.repeater.init();

        // and wipe out the basic links.
        $('.basiclink').click(function() {
            return false;
        });
    };
    _event.initialize = _initialize;

    $ax.event.HasTextChanged = function(diagramObject) {
        if(diagramObject.type != 'textBox' && diagramObject.type != 'textArea') return false;
        var map = diagramObject.interactionMap;
        return map && map.onTextChange;
    };

    $ax.event.TryFireTextChanged = function(elementId) {
        var query = $('#' + elementId);
        if(!$ax.hasElementTextChanged(elementId, query.val())) return;
        $ax.updateElementText(elementId, query.val());

        $ax.event.raiseSyntheticEvent(elementId, 'onTextChange');
    };

    $ax.event.HasSelectionChanged = function(diagramObject) {
        if(diagramObject.type != 'listBox' && diagramObject.type != 'comboBox') return false;
        var map = diagramObject.interactionMap;
        return map && map.onSelectionChange;
    };

    $ax.event.HasCheckedChanged = function(diagramObject) {
        if(diagramObject.type != 'checkbox' && diagramObject.type != 'radioButton') return false;
        var map = diagramObject.interactionMap;
        return map && map.onCheckedChange;
    };

    var _tryFireCheckedChanged = function(elementId) {
        var isRadio = $obj(elementId).type == 'radioButton';
        if(isRadio) {
            var last = $ax.updateRadioButtonSelected($('#' + elementId).attr('name'), elementId);

            // If no change, this should not fire
            if(last == elementId) return;

            // Initially selecting one, last may be undefined
            if(last) $ax.event.raiseSyntheticEvent(last, 'onCheckedChange');
        }

        $ax.event.raiseSyntheticEvent(elementId, 'onCheckedChange');
    };

    var _loadDynamicPanelsAndMasters = function(objects, path, itemId) {
        fireEventThroughContainers('onLoad', objects, true, ['page', 'referenceDiagramObject', 'dynamicPanel'], ['page', 'referenceDiagramObject', 'dynamicPanel'], path, itemId);
    };
    $ax.loadDynamicPanelsAndMasters = _loadDynamicPanelsAndMasters;

    // Filters include page, referenceDiagramObject, dynamicPanel, and repeater. Not, callFilter of repeater not yet supported. See note below.
    var fireEventThroughContainers = function(eventName, objects, synthetic, searchFilter, callFilter, path, itemId) {
        // TODO: may want to pass in this as a parameter. At that point, may want to convert some of them to an option parameter. For now this is the only case
        var skipShowDescription = eventName == 'onLoad';

        // If objects undefined, load page
        if(!objects) {
            if(callFilter.indexOf('page') != -1) {
                var map = $ax.pageData.page.interactionMap;
                var pageEventInfo = $ax.getEventInfoFromEvent($ax.getEvent(), skipShowDescription, '');
                var pageEvent = map && map[eventName];
                if(pageEvent) _handleEvent('', pageEventInfo, pageEvent, skipShowDescription, synthetic);
            }
            if(searchFilter.indexOf('page') != -1) fireEventThroughContainers(eventName, $ax.pageData.page.diagram.objects, synthetic, searchFilter, callFilter);
            return;
        }

        if(!path) path = [];

        var pathCopy = [];
        for(var j = 0; j < path.length; j++) pathCopy[j] = path[j];

        for(var i = 0; i < objects.length; i++) {
            var obj = objects[i];
            if(obj.type != 'referenceDiagramObject' && obj.type != 'dynamicPanel' && obj.type != 'repeater') continue;

            pathCopy[path.length] = obj.id;
            var objId = $ax.getScriptIdFromPath(pathCopy);
            objId = $ax.repeater.createElementId(objId, itemId);

            if(obj.type == 'referenceDiagramObject') {
                if(callFilter.indexOf('referenceDiagramObject') != -1) {
                    var eventInfo = $ax.getEventInfoFromEvent($ax.getEvent(), skipShowDescription, objId);
                    eventInfo.isMasterEvent = true;
                    var axEvent = $ax.pageData.masters[obj.masterId].interactionMap[eventName];
                    if(axEvent) _handleEvent(objId, eventInfo, axEvent, skipShowDescription, synthetic);
                }
                if(searchFilter.indexOf('referenceDiagramObject') != -1) fireEventThroughContainers(eventName, $ax.pageData.masters[obj.masterId].diagram.objects, synthetic, searchFilter, callFilter, pathCopy, itemId);
            } else if(obj.type == 'dynamicPanel') {
                if(callFilter.indexOf('dynamicPanel') != -1) $ax.event.raiseSyntheticEvent(objId, eventName, skipShowDescription, undefined, !synthetic);

                if(searchFilter.indexOf('dynamicPanel') != -1) {
                    var diagrams = obj.diagrams;
                    for(var j = 0; j < diagrams.length; j++) {
                        fireEventThroughContainers(eventName, diagrams[j].objects, synthetic, searchFilter, callFilter, path, itemId);
                    }
                }
            } else if(obj.type == 'repeater') {
                // TODO: Right now no events are fired for the repeater here. If we do, we need to decide whether to do it for each item or once overall.
                if(searchFilter.indexOf('repeater') != -1) {
                    var itemIds = $ax.getItemIdsForRepeater(objId);
                    for(var j = 0; j < itemIds.length; j++) {
                        fireEventThroughContainers(eventName, obj.objects, synthetic, searchFilter, callFilter, path, itemIds[j]);
                    }
                }
            }
        }
    };

    // FOCUS stuff
    (function() {

    })();



    var _pageLoad = function() {
        // Map of axure event names to pair of what it should attach to, and what the jquery event name is.
        var PAGE_AXURE_TO_JQUERY_EVENT_NAMES = {
            'onScroll': [window, 'scroll'],
            'onResize': [window, 'resize'],
            'onContextMenu': [window, 'contextmenu']
        };
        if(!$ax.features.supports.mobile) {
            PAGE_AXURE_TO_JQUERY_EVENT_NAMES.onClick = ['body', 'click'];
            PAGE_AXURE_TO_JQUERY_EVENT_NAMES.onDoubleClick = ['body', 'dblclick'];
            PAGE_AXURE_TO_JQUERY_EVENT_NAMES.onMouseMove = ['body', 'mousemove'];
        } else {
            _event.initMobileEvents(function(initTap) { initTap(window, ''); }, function(initMove) { initMove(window, ''); });
            $(window).bind($ax.features.eventNames.mouseDownName, _updateMouseLocation);
            $(window).bind($ax.features.eventNames.mouseUpName, function(e) { _updateMouseLocation(e, true); });
        }
        $(window).bind($ax.features.eventNames.mouseMoveName, _updateMouseLocation);

        for(key in PAGE_AXURE_TO_JQUERY_EVENT_NAMES) {
            if(!PAGE_AXURE_TO_JQUERY_EVENT_NAMES.hasOwnProperty(key)) continue;
            (function(axureName) {
                var jqueryEventNamePair = PAGE_AXURE_TO_JQUERY_EVENT_NAMES[axureName];
                $(jqueryEventNamePair[0])[jqueryEventNamePair[1]](function() {
                    return fireEventThroughContainers(axureName, undefined, false, ['page', 'referenceDiagramObject', 'dynamicPanel', 'repeater'], ['page', 'referenceDiagramObject']);
                });
            })(key);
        }
    };
    _event.pageLoad = _pageLoad;


});