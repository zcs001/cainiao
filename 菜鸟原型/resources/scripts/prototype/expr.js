﻿// ******* Expr MANAGER ******** //
$axure.internal(function($ax) {
    var _expr = $ax.expr = {};
    var _binOpHandlers = {
        '&&': function(left, right) { return $ax.getBool(left) && $ax.getBool(right); },
        '||': function(left, right) { return $ax.getBool(left) || $ax.getBool(right); },
        '==': function(left, right) { return isEqual(left, right); },
        '!=': function(left, right) { return !isEqual(left, right); },
        '>': function(left, right) { return left > Number(right); },
        '<': function(left, right) { return left < Number(right); },
        '>=': function(left, right) { return left >= Number(right); },
        '<=': function(left, right) { return left <= Number(right); }
    };

    var isEqual = function(left, right) {
        if(left instanceof Object && right instanceof Object) {
            var prop;
            // Go through all of lefts properties and compare them to rights.
            for(prop in left) {
                if(!left.hasOwnProperty(prop)) continue;
                // If left has a property that the right doesn't they are not equal.
                if(!right.hasOwnProperty(prop)) return false;
                // If any of their properties are not equal, they are not equal.
                if(!isEqual(left[prop], right[prop])) return false;
            }

            for(prop in right) {
                // final check to make sure right doesn't have some extra properties that make them not equal.
                if(left.hasOwnProperty(prop) != right.hasOwnProperty(prop)) return false;
            }

            return true;
        }
        return $ax.getBool(left) == $ax.getBool(right);
    };

    var _exprHandlers = {};
    _exprHandlers.array = function(expr, eventInfo) {
        var returnVal = [];
        for(var i = 0; i < expr.items.length; i++) {
            returnVal[returnVal.length] = _evaluateExpr(expr, eventInfo);
        }
        return returnVal;
    };

    _exprHandlers.binaryOp = function(expr, eventInfo) {
        var left = expr.leftExpr && _evaluateExpr(expr.leftExpr, eventInfo);
        var right = expr.rightExpr && _evaluateExpr(expr.rightExpr, eventInfo);

        if(left == undefined || right == undefined) return false;
        return _binOpHandlers[expr.op](left, right);
    };

    _exprHandlers.block = function(expr, eventInfo) {
        var subExprs = expr.subExprs;
        for(var i = 0; i < subExprs.length; i++) {
            _evaluateExpr(subExprs[i], eventInfo); //ignore the result
        }
    };

    _exprHandlers.booleanLiteral = function(expr) {
        return expr.value;
    };

    _exprHandlers.nullLiteral = function() { return null; };

    _exprHandlers.pathLiteral = function(expr, eventInfo) {
        if(expr.isThis) return [eventInfo.srcElement];
        if(expr.isFocused && window.lastFocusedControl) {
            window.lastFocusedControl.focus();
            return [window.lastFocusedControl.getAttribute('id')];
        }

        return $ax.getElementIdsFromPath(expr.value, eventInfo);
    };

    _exprHandlers.panelDiagramLiteral = function(expr, eventInfo) {
        var elementIds = $ax.getElementIdsFromPath(expr.panelPath, eventInfo);
        var elementIdsWithSuffix = [];
        var suffix = '_state' + expr.panelIndex;
        for(var i = 0; i < elementIds.length; i++) {
            elementIdsWithSuffix[i] = $ax.repeater.applySuffixToElementId(elementIds[i], suffix);
        }
        return elementIdsWithSuffix;
    };

    _exprHandlers.fcall = function(expr, eventInfo) {
        var fcallArgs = [];
        var exprArgs = expr.arguments;
        for(var i = 0; i < expr.arguments.length; i++) {
            fcallArgs[i] = _evaluateExpr(exprArgs[i], eventInfo);
        }
        // Add event info to the end
        fcallArgs[fcallArgs.length] = eventInfo;

        return _exprFunctions[expr.functionName].apply(this, fcallArgs);
    };

    _exprHandlers.globalVariableLiteral = function(expr) {
        return expr.variableName;
    };

    _exprHandlers.keyPressLiteral = function(expr) {
        var keyInfo = {};
        keyInfo.keyCode = expr.keyCode;
        keyInfo.ctrl = expr.ctrl;
        keyInfo.alt = expr.alt;
        keyInfo.shift = expr.shift;

        return keyInfo;
    };

    _exprHandlers.adaptiveViewLiteral = function(expr) {
        return expr.id;
    };

    var _substituteSTOs = function(expr, eventInfo) {
        //first evaluate the local variables
        var scope = {};
        for(var varName in expr.localVariables) {
            scope[varName] = $ax.expr.evaluateExpr(expr.localVariables[varName], eventInfo);
        }

        // TODO: [ben] Clean up how to do date.
        var i = 0;
        var retval;
        var retvalString = expr.value.replace(/\[\[(?!\[)(.*?)\]\](?=\]*)/g, function(match) {
            var sto = expr.stos[i++];
            if(sto.sto == 'error') return match;
            var result = $ax.evaluateSTO(sto, scope, eventInfo);

            if((result instanceof Object) && i == 1 && expr.value.substring(0, 2) == '[[' &&
                expr.value.substring(expr.value.length - 2) == ']]') {
                // If the result was an object, this was the first result, and the whole thing was this expresion.
                retval = result;
            }
            return ((result instanceof Object) && result.Label) || result;
        });
        // If more than one group returned, the object is not valid
        if(i != 1) retval = false;
        return retval || retvalString;
    };

    _exprHandlers.htmlLiteral = function(expr, eventInfo) {
        return _substituteSTOs(expr, eventInfo);
    };

    _exprHandlers.stringLiteral = function(expr, eventInfo) {
        return _substituteSTOs(expr, eventInfo);
    };

    var _exprFunctions = {};

    _exprFunctions.SetCheckState = function(elementIds, value) {
        var toggle = value == 'toggle';
        var boolValue = Boolean(value) && value != 'false';

        for(var i = 0; i < elementIds.length; i++) {
            var query = $ax('#' + elementIds[i]);
            query.selected(toggle ? !query.selected() : boolValue);
        }
    };

    _exprFunctions.SetSelectedOption = function(elementIds, value) {
        for(var i = 0; i < elementIds.length; i++) {
            var elementId = elementIds[i];
            var obj = $jobj(elementId);

            if(obj.val() == value) return;
            obj.val(value);

            if($ax.event.HasSelectionChanged($ax.getObjectFromElementId(elementId))) $ax.event.raiseSyntheticEvent(elementId, 'onSelectionChange');
        }
    };

    _exprFunctions.SetGlobalVariableValue = function(varName, value) {
        $ax.globalVariableProvider.setVariableValue(varName, value);
    };

    _exprFunctions.SetWidgetFormText = function(elementIds, value) {
        for(var i = 0; i < elementIds.length; i++) {
            var elementId = elementIds[i];

            var obj = $jobj(elementId);
            if(obj.val() == value) return;
            obj.val(value);
            $ax.placeholderManager.updatePlaceholder(elementId, !value);
            if($ax.event.HasTextChanged($ax.getObjectFromElementId(elementId))) $ax.event.TryFireTextChanged(elementId);
        }
    };

    _exprFunctions.SetFocusedWidgetText = function(elementId, value) {
        if(window.lastFocusedControl) {
            window.lastFocusedControl.focus();
            window.lastFocusedControl.value = value;
        }
    };

    _exprFunctions.GetRtfElementHeight = function(rtfElement) {
        if(rtfElement.innerHTML == '') rtfElement.innerHTML = '&nbsp;';
        return rtfElement.offsetHeight;
    };

    _exprFunctions.SetWidgetRichText = function(ids, value) {
        // Converts dates, widgetinfo, and the like to strings.
        value = _exprFunctions.ToString(value);

        //Replace any newlines with line breaks
        value = value.replace(/\n/g, '<br>');

        for(var i = 0; i < ids.length; i++) {
            var id = ids[i];

            // If calling this on button shape, get the id of the rich text panel inside instead
            var type = $obj(id).type;
            if(type != 'richTextPanel' && type != 'hyperlink') {
                id = $jobj(id).children('.text')[0].id;
            }

            var element = window.document.getElementById(id);
            //        if(!$ax.visibility.IsVisible(element)) 
            $ax.visibility.SetVisible(element, true);

            $jobj(id).css('font-size', '1px');
            $ax.style.transformTextWithVerticalAlignment(id, function() {
                element.innerHTML = value;
            });

            $ax.style.CacheOriginalText(id, true);
        }
    };

    _exprFunctions.GetCheckState = function(ids) {
        var id = ids[0];
        return $ax('#' + id).selected();
    };

    _exprFunctions.GetSelectedOption = function(ids) {
        return $jobj(ids[0])[0].value;
    };

    _exprFunctions.GetNum = function(str) {
        //Setting a GlobalVariable to some blank text then setting a widget to the value of that variable would result in 0 not ""
        //I have fixed this another way so commenting this should be fine now
        //if (!str) return "";
        return isNaN(str) ? str : Number(str);
    };

    _exprFunctions.GetGlobalVariableValue = function(id) {
        return $ax.globalVariableProvider.getVariableValue(id);
    };

    _exprFunctions.GetGlobalVariableLength = function(id) {
        return GetGlobalVariableValue(id).length;
    };

    _exprFunctions.GetWidgetText = function(ids) {
        return $ax('#' + ids[0]).text();
    };

    _exprFunctions.GetFocusedWidgetText = function() {
        if(window.lastFocusedControl) {
            return window.lastFocusedControl.value;
        } else {
            return "";
        }
    };

    _exprFunctions.GetWidgetValueLength = function(ids) {
        var id = ids[0];
        if(!id) return undefined;
        return window.document.getElementById(id).value.length;
    };

    _exprFunctions.GetPanelState = function(ids) {
        var id = ids[0];
        if(!id) return undefined;
        return $ax.visibility.GetPanelState(id);
    };

    _exprFunctions.GetWidgetVisibility = function(ids) {
        var id = ids[0];
        if(!id) return undefined;
        return $ax.visibility.IsIdVisible(id);
    };

    // *****************  Validation Functions ***************** //

    _exprFunctions.IsValueAlpha = function(val) {
        var isAlphaRegex = new RegExp("^[a-z\\s]+$", "gi");
        return isAlphaRegex.test(val);
    };

    _exprFunctions.IsValueNumeric = function(val) {
        var isNumericRegex = new RegExp("^[0-9,\\.\\s]+$", "gi");
        return isNumericRegex.test(val);
    };

    _exprFunctions.IsValueAlphaNumeric = function(val) {
        var isAlphaNumericRegex = new RegExp("^[0-9a-z\\s]+$", "gi");
        return isAlphaNumericRegex.test(val);
    };

    _exprFunctions.IsValueOneOf = function(val, values) {
        for(var i = 0; i < values.length; i++) {
            var option = values[i];
            if(val == option) return true;
        }
        //by default, return false
        return false;
    };

    _exprFunctions.IsValueNotAlpha = function(val) {
        return !IsValueAlpha(val);
    };

    _exprFunctions.IsValueNotNumeric = function(val) {
        return !IsValueNumeric(val);
    };

    _exprFunctions.IsValueNotAlphaNumeric = function(val) {
        return !IsValueAlphaNumeric(val);
    };

    _exprFunctions.IsValueNotOneOf = function(val, values) {
        return !IsValueOneOf(val, values);
    };

    _exprFunctions.GetKeyPressed = function(eventInfo) {
        return eventInfo.keyInfo;
    };

    _exprFunctions.GetDragCursorRectangles = function() {
        return $ax.drag.GetDragCursorRectangles();
    };

    _exprFunctions.GetWidgetRectangles = function(elementId, eventInfo) {
        var widget = window.document.getElementById(elementId[0]);
        var rects = new Object();
        rects.lastRect = new $ax.drag.Rectangle(
                $ax.legacy.getAbsoluteLeft(widget),
                $ax.legacy.getAbsoluteTop(widget),
                Number($('#' + elementId).css('width').replace("px", "")),
                Number($('#' + elementId).css('height').replace("px", "")));

        var repeaterId = $ax.getParentRepeaterFromScriptId($ax.repeater.getScriptIdFromElementId(elementId[0]));
        if(repeaterId) {
            var itemId = eventInfo.srcElement && $ax.repeater.getItemIdFromElementId(eventInfo.srcElement);
            var obj = $ax.getObjectFromElementId(repeaterId);
            var count = $ax.repeater.getItemCount(repeaterId);
            var original = rects.lastRect;
            var copy = original.Move(original.x, original.y);
            if(!itemId) rects.lastRect = [];

            var offset = obj.itemSizeMap[$ax.adaptive.currentViewId || ''];
            var xOffset = offset.width + obj.horizontalSpacing;
            var yOffset = offset.height + obj.verticalSpacing;

            for(var i = 1; i <= count; i++) {
                // If no id, keep adding all of them, otherwise, if we are at the one we want, take it and break.
                if(!itemId) {
                    rects.lastRect[rects.lastRect.length] = copy;
                } else if(itemId == i) {
                    rects.lastRect = copy;
                    break;
                }

                if(obj.wrap != -1 && i % obj.wrap == 0) {
                    if(obj.vertical) {
                        copy = original.Move(copy.x + xOffset, 0);
                    } else {
                        copy = original.Move(0, copy.y + yOffset);
                    }
                } else if(obj.vertical) copy = original.Move(copy.x, copy.y + yOffset);
                else copy = original.Move(copy.x + xOffset, copy.y);
            }

        }
        rects.currentRect = rects.lastRect;
        return rects;
    };

    _exprFunctions.GetWidget = function(elementId) {
        return $ax.getWidgetInfo(elementId[0]);
    };

    _exprFunctions.GetAdaptiveView = function() {
        return $ax.adaptive.currentViewId || '';
    };

    _exprFunctions.IsEntering = function(movingRects, targetRects) {
        return !movingRects.lastRect.IntersectsWith(targetRects.currentRect) && movingRects.currentRect.IntersectsWith(targetRects.currentRect);
    };

    _exprFunctions.IsLeaving = function(movingRects, targetRects) {
        return movingRects.lastRect.IntersectsWith(targetRects.currentRect) && !movingRects.currentRect.IntersectsWith(targetRects.currentRect);
    };

    var _IsOver = _exprFunctions.IsOver = function(movingRects, targetRects) {
        return movingRects.currentRect.IntersectsWith(targetRects.currentRect);
    };

    _exprFunctions.IsNotOver = function(movingRects, targetRects) {
        return !_IsOver(movingRects, targetRects);
    };

    _exprFunctions.ValueContains = function(inputString, value) {
        return inputString.indexOf(value) > -1;
    };

    _exprFunctions.ValueNotContains = function(inputString, value) {
        return !_exprFunctions.ValueContains(inputString, value);
    };

    _exprFunctions.ToString = function(value) {
        if(value.isWidget) {
            return value.Text;
        }
        return String(value);
    };

    var _evaluateExpr = $ax.expr.evaluateExpr = function(expr, eventInfo, toString) {
        if(expr === undefined || expr === null) return undefined;
        var result = _exprHandlers[expr.exprType](expr, eventInfo);
        return toString ? _exprFunctions.ToString(result) : result;
    };


});