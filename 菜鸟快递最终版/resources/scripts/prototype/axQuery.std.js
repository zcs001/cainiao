﻿// ******* AxQuery Plugins ******** //

$axure.internal(function($ax) {
    var DYNAMIC_PANEL_TYPE = 'dynamicPanel';
    var TEXT_BOX_TYPE = 'textBox';
    var TEXT_AREA_TYPE = 'textArea';
    var LIST_BOX_TYPE = 'listBox';
    var COMBO_BOX_TYPE = 'comboBox';
    var CHECK_BOX_TYPE = 'checkbox';
    var RADIO_BUTTON_TYPE = 'radioButton';
    var IMAGE_MAP_REGION_TYPE = 'imageMapRegion';
    var IMAGE_BOX_TYPE = 'imageBox';
    var BUTTON_SHAPE_TYPE = 'buttonShape';
    var TREE_NODE_OBJECT_TYPE = 'treeNodeObject';
    var TABLE_CELL_TYPE = 'tableCell';

    var _addJQueryFunction = function(name) {
        $ax.public.fn[name] = function() {
            var val = $.fn[name].apply(this.jQuery(), arguments);
            return arguments[0] ? this : val;
        };
    };
    var _jQueryFunctionsToAdd = ['text', 'val', 'css'];
    for(var i = 0; i < _jQueryFunctionsToAdd.length; i++) _addJQueryFunction(_jQueryFunctionsToAdd[i]);

    var _addJQueryEventFunction = function(name) {
        $ax.public.fn[name] = function() {
            $.fn[name].apply(this.jQuery(), arguments);
            return this;
        };
    };
    var _jQueryEventFunctionsToAdd = ['click', 'mouseover', 'mouseleave', 'bind'];
    for(var i = 0; i < _jQueryEventFunctionsToAdd.length; i++) _addJQueryEventFunction(_jQueryEventFunctionsToAdd[i]);


    $ax.public.fn.openLink = function(url, includeVariables) {
        this.jQuery().each(function() {
            if(!($(this).is('iframe'))) {
                return;
            }

            var objIframe = $(this).get(0);

            $ax.navigate({
                url: url,
                target: "frame",
                includeVariables: includeVariables,
                frame: objIframe
            });
        });

        return this;
    };

    $ax.public.fn.SetPanelState = function(stateNumber, options, showWhenSet, eventInfo) {
        var easingIn = 'none';
        var easingOut = 'none';
        var directionIn = '';
        var directionOut = '';
        var durationIn = 500;
        var durationOut = 500;

        if(options && options.animateIn) {
            easingIn = 'fade';
            directionIn = _getEasingDirection(options.animateIn);
            if(directionIn != '') easingIn = 'swing';
            if(options.animateIn.duration) {
                durationIn = options.animateIn.duration;
            }
        }

        if(options && options.animateOut) {
            easingOut = 'fade';
            directionOut = _getEasingDirection(options.animateOut);
            if(directionOut != '') easingOut = 'swing';
            if(options.animateOut.duration) {
                durationOut = options.animateOut.duration;
            }
        }

        var elementIds = this.getElementIds();

        for(var index = 0; index < elementIds.length; index++) {
            var elementId = elementIds[index];
            if($ax.getTypeFromElementId(elementId) == DYNAMIC_PANEL_TYPE) {
                var stateName = $ax.visibility.GetPanelStateId(elementId, Number(stateNumber) - 1, eventInfo);
                if(options.compress && $obj(elementId).fitToContent) {
                    $ax.dynamicPanelManager.compressDelta(elementId, $ax.visibility.GetPanelState(elementId), stateName, options.vertical, options.compressEasing, options.compressDuration);
                }
                $ax.visibility.SetPanelState(elementId, stateName, easingOut, directionOut, durationOut, easingIn, directionIn, durationIn, showWhenSet);
            }
        }

        return this;
    };

    $ax.public.fn.show = function(options, eventInfo) {
        var easing = options && options.easing || 'none';
        var duration = options && options.duration || 0;

        var direction = _getEasingDirection(options);
        if(direction != '') easing = 'swing';

        var elementIds = this.getElementIds();

        for(var index = 0; index < elementIds.length; index++) {
            var elementId = elementIds[index];

            var lightboxId = $ax.repeater.applySuffixToElementId(elementId, '_lightbox');
            var lightbox = $jobj(lightboxId);
            if(options && options.showType == 'lightbox') {
                $ax.flyoutManager.unregisterPanel(elementId, true);
                // Add lightbox if there isn't one
                if(lightbox.length == 0) {
                    lightbox = $('<div></div>');
                    lightbox.attr('id', lightboxId);
                    var color = 'rgb(' + options.lightbox.r + ',' + options.lightbox.g + ',' + options.lightbox.b + ')';
                    lightbox.css({
                        position: 'fixed',
                        left: '0px',
                        top: '0px',
                        width: '10000px',
                        height: '10000px',
                        'background-color': color,
                        opacity: options.lightbox.a / 255
                    });
                    $('body').append(lightbox);
                    (function(lightbox, query) {
                        lightbox.click(function() {
                            $ax.action.addAnimation(elementId, function() {
                                query.hide();
                                lightbox.remove();
                            });
                        });
                    })(lightbox, this);
                }
                $ax.legacy.BringToFront(lightboxId, true);
                $ax.legacy.BringToFront(elementId, true);
            } else if(options && options.showType == 'flyout') {
                // Remove lightbox if there is one
                lightbox.remove();

                var src = eventInfo.thiswidget;
                var target = $ax.getWidgetInfo(elementId);
                var rects = {};
                if(src.valid) rects.src = $ax.geometry.genRect(src.pagex, src.pagey, src.width, src.height);
                if(target.valid) rects.target = $ax.geometry.genRect(target.pagex, target.pagey, target.width, target.height);
                $ax.flyoutManager.registerFlyout(rects, elementId, eventInfo.srcElement);
                $ax.style.AddRolloverOverride(elementId);
                $ax.legacy.BringToFront(elementId);
            } else {
                // Remove lightbox, unregister flyout
                lightbox.remove();
                $ax.flyoutManager.unregisterPanel(elementId, true);

                var wasShown = $ax.visibility.IsIdVisible(elementId);
                _setVisibility(elementId, true, easing, direction, duration);
                if(options && options.showType == 'front') $ax.legacy.BringToFront(elementId);
                else if(options && options.showType == 'compress' && !wasShown) $ax.dynamicPanelManager.compressToggle(elementId, options.vertical, true, options.compressEasing, options.compressDuration);

                continue;
            }
            _setVisibility(elementId, true, easing, direction, duration);
        }

        return this;
    };

    var _getEasingDirection = function(options) {
        if(options && options.easing) {
            if(options.easing == 'slideLeft') {
                return 'left';
            } else if(options.easing == 'slideRight') {
                return 'right';
            } else if(options.easing == 'slideUp') {
                return 'up';
            } else if(options.easing == 'slideDown') {
                return 'down';
            }
        }
        return '';
    };

    $ax.public.fn.hide = function(options) {
        var easing = options && options.easing || 'none';
        var duration = options && options.duration || 0;

        var direction = _getEasingDirection(options);
        if(direction != '') easing = 'swing';

        var elementIds = this.getElementIds();

        for(var index = 0; index < elementIds.length; index++) {
            var elementId = elementIds[index];
            var wasShown = $ax.visibility.IsIdVisible(elementId);
            _setVisibility(elementId, false, easing, direction, duration);
            if(options && options.showType == 'compress' && wasShown) $ax.dynamicPanelManager.compressToggle(elementId, options.vertical, false, options.compressEasing, options.compressDuration);
        }

        return this;
    };

    $ax.public.fn.toggleVisibility = function(options) {
        var easing = options && options.easing || 'none';
        var duration = options && options.duration || 0;

        var direction = _getEasingDirection(options);
        if(direction != '') easing = 'swing';

        var elementIds = this.getElementIds();
        for(var index = 0; index < elementIds.length; index++) {
            var elementId = elementIds[index];
            var show = !$ax.visibility.IsIdVisible(elementId);
            _setVisibility(elementId, show, easing, direction, duration);
            if(options && options.showType == 'compress') $ax.dynamicPanelManager.compressToggle(elementId, options.vertical, show, options.compressEasing, options.compressDuration);
        }

        return this;
    };

    var _setVisibility = function(elementId, value, easing, direction, duration) {
        $ax.visibility.SetWidgetVisibility(elementId, {
            value: value,
            easing: easing,
            direction: direction,
            duration: duration,
            fire: true
        });
    };

    $ax.public.fn.moveTo = function(x, y, options) {
        var easing = 'none';
        var duration = 500;

        if(options && options.easing) {
            easing = options.easing;

            if(options.duration) {
                duration = options.duration;
            }
        }

        var elementIds = this.getElementIds();

        for(var index = 0; index < elementIds.length; index++) {
            $ax.move.MoveWidget(elementIds[index], x, y, easing, duration, true, null, true);
        }

        return this;
    };

    $ax.public.fn.moveBy = function(x, y, options) {
        if(x == 0 && y == 0) {
            var id = this.getElementIds()[0];
            $ax.event.raiseSyntheticEvent(id, "onMove");
            $ax.action.fireAnimationFromQueue(id);
            return this;
        }
        var easing = 'none';
        var duration = 500;

        if(options && options.easing) {
            easing = options.easing;

            if(options.duration) {
                duration = options.duration;
            }
        }

        var elementIds = this.getElementIds();

        for(var index = 0; index < elementIds.length; index++) {
            $ax.move.MoveWidget(elementIds[index], x, y, easing, duration, false, null, true);
        }

        return this;
    };

    $ax.public.fn.bringToFront = function() {
        var elementIds = this.getElementIds();

        for(var index = 0; index < elementIds.length; index++) {
            $ax.legacy.BringToFront(elementIds[index]);
        }

        return this;
    };

    $ax.public.fn.sendToBack = function() {
        var elementIds = this.getElementIds();

        for(var index = 0; index < elementIds.length; index++) {
            $ax.legacy.SendToBack(elementIds[index]);
        }

        return this;
    };

    $ax.public.fn.text = function() {
        if(arguments[0] == undefined) {
            var firstId = this.getElementIds()[0];

            if(!firstId) {
                return undefined;
            }

            return getWidgetText(firstId);
        } else {
            var elementIds = this.getElementIds();

            for(var index = 0; index < elementIds.length; index++) {
                var currentItem = elementIds[index];

                var widgetType = $ax.getTypeFromElementId(currentItem);

                if(widgetType == TEXT_BOX_TYPE || widgetType == TEXT_AREA_TYPE) { //For non rtf
                    SetWidgetFormText(currentItem, arguments[0]);
                } else {
                    var idRtf = '#' + currentItem;
                    if($(idRtf).length == 0) idRtf = '#u' + (Number(currentItem.substring(1)) + 1);

                    if($(idRtf).length != 0) {
                        //If the richtext div already has some text in it,
                        //preserve only the first style and get rid of the rest
                        //If no pre-existing p-span tags, don't do anything
                        if($(idRtf).children('p').find('span').length > 0) {
                            $(idRtf).children('p:not(:first)').remove();
                            $(idRtf).children('p').find('span:not(:first)').remove();

                            //Replace new-lines with NEWLINE token, then html encode the string,
                            //finally replace NEWLINE token with linebreak
                            var textWithLineBreaks = arguments[0].replace(/\n/g, '--NEWLINE--');
                            var textHtml = $('<div/>').text(textWithLineBreaks).html();
                            $(idRtf).find('span').html(textHtml.replace(/--NEWLINE--/g, '<br>'));
                        }
                    }
                }
            }

            return this;
        }
    };

    var getWidgetText = function(id) {
        var idQuery = $('#' + id);

        if(idQuery.is('div')) {
            var $rtfObj = idQuery.find('.text');
            if($rtfObj.length == 0) return undefined;

            var textOut = '';
            $rtfObj.children('p').each(function(index) {
                if(index != 0) textOut += '\n';

                //Replace line breaks (set in SetWidgetRichText) with newlines and nbsp's with regular spaces.
                var htmlContent = $(this).html().replace(/<br[^>]*>/ig, '\n').replace(/&nbsp;/ig, ' ');
                textOut += $(htmlContent).text();
            });

            return textOut;
        } else if(idQuery.is('input') &&
            (idQuery.attr('type') == 'checkbox' || idQuery.attr('type') == 'radio')) {
            return idQuery.parent().find('label').find('.text').text();
        } else {
            return idQuery.val();
        }
    };

    $ax.public.fn.setRichTextHtml = function() {
        if(arguments[0] == undefined) {
            //No getter function, so just return undefined
            return undefined;
        } else {
            var elementIds = this.getElementIds();

            for(var index = 0; index < elementIds.length; index++) {
                var currentItem = elementIds[index];

                var widgetType = $ax.getTypeFromElementId(currentItem);
                if(widgetType == TEXT_BOX_TYPE || widgetType == TEXT_AREA_TYPE) { //Do nothing for non rtf
                    continue;
                } else {
                    //TODO -- [mas] fix this!
                    var idRtf = '#' + currentItem;
                    if($(idRtf).length == 0) idRtf = '#u' + (parseInt(currentItem.substring(1)) + 1);
                    if($(idRtf).length != 0) SetWidgetRichText(idRtf, arguments[0]);
                }
            }

            return this;
        }
    };

    $ax.public.fn.value = function() {
        if(arguments[0] == undefined) {
            var firstId = this.getElementIds()[0];

            if(!firstId) {
                return undefined;
            }

            var widgetType = $ax.getTypeFromElementId(firstId);

            if(widgetType == COMBO_BOX_TYPE || widgetType == LIST_BOX_TYPE) { //for select lists and drop lists
                return $('#' + firstId + ' :selected').text();
            } else if(widgetType == CHECK_BOX_TYPE || widgetType == RADIO_BUTTON_TYPE) { //for radio/checkboxes
                return this.jQuery().first().is(':checked');
            } else { //for text based form elements
                return this.jQuery().first().val();
            }
        } else {
            var elementIds = this.getElementIds();

            for(var index = 0; index < elementIds.length; index++) {
                var widgetType = $ax.getTypeFromElementId(elementIds[index]);

                var elementIdQuery = $('#' + elementIds[index]);

                if(widgetType == CHECK_BOX_TYPE || widgetType == RADIO_BUTTON_TYPE) { //for radio/checkboxes
                    if(arguments[0] == true) {
                        elementIdQuery.attr('checked', true);
                    } else if(arguments[0] == false) {
                        elementIdQuery.removeAttr('checked');
                    }
                } else { //For select lists, drop lists, text based form elements
                    elementIdQuery.val(arguments[0]);
                }
            }

            return this;
        }
    };

    $ax.public.fn.checked = function() {
        if(arguments[0] == undefined) {
            return this.jQuery().prop('checked');
        } else {
            this.jQuery().prop('checked', arguments[0]);
            return this;
        }
    };

    var _getRelativeLeft = function(node, parent) {
        var currentNode = node;
        var left = 0;
        while(currentNode != null && currentNode.tagName != "BODY") {
            left += currentNode.offsetLeft;
            currentNode = currentNode.offsetParent;
            if(currentNode == parent) break;
        }
        return left;
    };

    var _getRelativeTop = function(node, parent) {
        var currentNode = node;
        var top = 0;
        while(currentNode != null && currentNode.tagName != "BODY") {
            top += currentNode.offsetTop;
            currentNode = currentNode.offsetParent;
            if(currentNode == parent) break;
        }
        return top;
    };

    var _scrollHelper = function(id, scrollX, scrollY, easing, duration) {
        var target = window.document.getElementById(id);
        var scrollable = $ax.legacy.GetScrollable(target);
        var targetLeft = _getRelativeLeft(target, scrollable);
        var targetTop = _getRelativeTop(target, scrollable);
        if(!scrollX) targetLeft = scrollable.scrollLeft;
        if(!scrollY) targetTop = scrollable.scrollTop;

        var $scrollable = $(scrollable);
        if($scrollable.is('body')) {
            $scrollable = $('html,body');
        }

        if(easing == 'none') {
            if(scrollY) $scrollable.scrollTop(targetTop);
            if(scrollX) $scrollable.scrollLeft(targetLeft);
        } else {
            if(!scrollX) {
                $scrollable.animate({ scrollTop: targetTop }, duration, easing);
            } else if(!scrollY) {
                $scrollable.animate({ scrollLeft: targetLeft }, duration, easing);
            } else {
                $scrollable.animate({ scrollTop: targetTop, scrollLeft: targetLeft }, duration, easing);
            }
        }
    };

    $ax.public.fn.scroll = function(scrollOption) {
        var easing = 'none';
        var duration = 500;

        if(scrollOption && scrollOption.easing) {
            easing = scrollOption.easing;

            if(scrollOption.duration) {
                duration = scrollOption.duration;
            }
        }

        var scrollX = true;
        var scrollY = true;

        if(scrollOption.direction == 'vertical') {
            scrollX = false;
        } else if(scrollOption.direction == 'horizontal') {
            scrollY = false;
        }

        var elementIds = this.getElementIds();
        for(var index = 0; index < elementIds.length; index++) {
            //            if($ax.getTypeFromElementId(elementIds[index]) == IMAGE_MAP_REGION_TYPE) {
            _scrollHelper(elementIds[index], scrollX, scrollY, easing, duration);
            //            }
        }

        return this;
    };

    $ax.public.fn.enabled = function() {
        if(arguments[0] == undefined) {
            var firstId = this.getElementIds()[0];
            if(!firstId) return undefined;

            var widgetType = $ax.getTypeFromElementId(firstId);
            if(widgetType == IMAGE_BOX_TYPE || widgetType == BUTTON_SHAPE_TYPE) return !$ax.style.IsWidgetDisabled(firstId);
            else return this.jQuery().first().not(':disabled').length > 0;
        } else {
            var elementIds = this.getElementIds();

            for(var index = 0; index < elementIds.length; index++) {
                var elementId = elementIds[index];
                var widgetType = $ax.getTypeFromElementId(elementId);

                var enabled = arguments[0];
                if(widgetType == IMAGE_BOX_TYPE || widgetType == BUTTON_SHAPE_TYPE) $ax.style.SetWidgetEnabled(elementId, enabled);
                if(widgetType == DYNAMIC_PANEL_TYPE) {
                    $ax.style.SetWidgetEnabled(elementId, enabled);
                    var children = this.getChildren()[index].children;
                    for(var i = 0; i < children.length; i++) {
                        var childId = children[i];
                        // Need to check this because of radio button and checkbox
                        var end = '_container';
                        if(childId.length > end.length && childId.substring(childId.length - end.length) == end) {
                            childId = childId.substring(0, childId.length - end.length);
                        }

                        $axure('#' + childId).enabled(enabled);
                    }
                }
                var jobj = $jobj(elementId);
                var child = jobj.children('input');
                if(child.length) jobj = child;

                if(enabled) jobj.removeAttr('disabled');
                else jobj.attr('disabled', 'disabled');
            }

            return this;
        }
    };

    $ax.public.fn.visible = function() {
        var ids = this.getElementIds();
        for(var index = 0; index < ids.length; index++) $ax.visibility.SetIdVisible(ids[index], arguments[0]);
        return this;
    };

    $ax.public.fn.selected = function() {
        if(arguments[0] == undefined) {
            var firstId = this.getElementIds()[0];
            if(!firstId) return this;

            var widgetType = $ax.getTypeFromElementId(firstId);
            if(widgetType == TREE_NODE_OBJECT_TYPE) {
                var treeNodeButtonShapeId = '';
                for(var elementId in $ax.getAllElementIds()) {
                    var currObj = $ax.getObjectFromElementId(elementId);

                    if(currObj.type == BUTTON_SHAPE_TYPE && currObj.parent && currObj.parent.scriptIds && currObj.parent.scriptIds[0] == firstId) {
                        treeNodeButtonShapeId = elementId;
                        break;
                    }
                }

                if(treeNodeButtonShapeId == '') return this;
                return $ax.style.IsWidgetSelected(treeNodeButtonShapeId);
            } else if(widgetType == IMAGE_BOX_TYPE || widgetType == BUTTON_SHAPE_TYPE || widgetType == TABLE_CELL_TYPE | widgetType == DYNAMIC_PANEL_TYPE) {
                return $ax.style.IsWidgetSelected(firstId);
            } else if(widgetType == CHECK_BOX_TYPE || widgetType == RADIO_BUTTON_TYPE) {
                return $jobj($ax.INPUT(firstId)).prop('checked');
            }
            return this;
        }
        var elementIds = this.getElementIds();
        var func = typeof (arguments[0]) === 'function' ? arguments[0] : null;
        var enabled = arguments[0]; // If this is a function it will be overridden with the return value;

        for(var index = 0; index < elementIds.length; index++) {
            var elementId = elementIds[index];
            if(func) {
                enabled = func($axure('#' + elementId));
            }

            var widgetType = $ax.getTypeFromElementId(elementId);

            if(widgetType == TREE_NODE_OBJECT_TYPE) { //for tree node
                var treeRootId = $('#' + elementIds[index]).parents('.treeroot').attr('id');

                var treeNodeButtonShapeId = '';
                var childElementIds = $jobj(elementIds[index]).children();
                for(var i = 0; i < childElementIds.length; i++) {
                    var elementId = childElementIds[i].id;
                    var currObj = $ax.getObjectFromElementId(elementId);

                    if(currObj && currObj.type == BUTTON_SHAPE_TYPE && currObj.parent &&
                        currObj.parent.scriptIds && currObj.parent.scriptIds[0] == elementIds[index]) {
                        treeNodeButtonShapeId = elementId;
                        break;
                    }
                }

                if(treeNodeButtonShapeId == '') continue;
                var treeNodeButtonShapeTextId = 'u' + (parseInt(treeNodeButtonShapeId.substring(1)) + 1);

                if(enabled) {
                    eval('$ax.tree.SelectTreeNode(currentSelected' + treeRootId + ', true, \'' + treeNodeButtonShapeId + '\', \'' + treeNodeButtonShapeTextId + '\')');
                } else if(!enabled) {
                    eval('De$ax.tree.SelectTreeNode(currentSelected' + treeRootId + ', true, \'' + treeNodeButtonShapeId + '\', \'' + treeNodeButtonShapeTextId + '\')');
                }
            } else if(widgetType == IMAGE_BOX_TYPE || widgetType == BUTTON_SHAPE_TYPE || widgetType == TABLE_CELL_TYPE || widgetType == DYNAMIC_PANEL_TYPE) {
                $ax.style.SetWidgetSelected(elementIds[index], enabled);
            } else if(widgetType == CHECK_BOX_TYPE || widgetType == RADIO_BUTTON_TYPE) {
                var query = $jobj($ax.INPUT(elementId));
                var curr = query.prop('checked');
                if(curr != enabled) {
                    query.prop('checked', enabled);
                    $ax.event.raiseSyntheticEvent(elementId, 'onCheckedChange');
                }
            }
        }
        return this;
    };

    $ax.public.fn.focus = function() {
        var firstId = this.getElementIds()[0];
        var focusableId = $ax.event.getFocusableWidgetOrChildId(firstId);
        $('#' + focusableId).focus();

        return this;
    };

    $ax.public.fn.expanded = function() {
        if(arguments[0] == undefined) {
            var firstId = this.getElementIds()[0];
            return firstId && $ax.getTypeFromElementId(firstId) !== TREE_NODE_OBJECT_TYPE && $ax.visibility.IsIdVisible(firstId + '_children');
        } else {
            var elementIds = this.getElementIds();

            for(var index = 0; index < elementIds.length; index++) {
                if($ax.getTypeFromElementId(elementIds[index]) == TREE_NODE_OBJECT_TYPE) {
                    var treeNodeId = elementIds[index];
                    var childContainerId = elementIds[index] + '_children';
                    var plusMinusId = 'u' + (parseInt(elementIds[index].substring(1)) + 1);

                    if($('#' + childContainerId).length == 0) {
                        plusMinusId = '';
                    }

                    if(arguments[0] == true) {
                        $ax.tree.ExpandNode(treeNodeId, childContainerId, plusMinusId);
                    } else if(arguments[0] == false) {
                        $ax.tree.CollapseNode(treeNodeId, childContainerId, plusMinusId);
                    }
                }
            }

            return this;
        }
    };
});