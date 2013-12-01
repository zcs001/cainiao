﻿
$axure.internal(function($ax) {
    var funcs = {};

    var weekday = new Array(7);
    weekday[0] = "Sunday";
    weekday[1] = "Monday";
    weekday[2] = "Tuesday";
    weekday[3] = "Wednesday";
    weekday[4] = "Thursday";
    weekday[5] = "Friday";
    weekday[6] = "Saturday";

    funcs.getDayOfWeek = function() {
        return _getDayOfWeek(this.getDay());
    };

    var _getDayOfWeek = $ax.getDayOfWeek = function(day) {
        return weekday[day];
    };

    var month = new Array(12);
    month[0] = "January";
    month[1] = "February";
    month[2] = "March";
    month[3] = "April";
    month[4] = "May";
    month[5] = "June";
    month[6] = "July";
    month[7] = "August";
    month[8] = "September";
    month[9] = "October";
    month[10] = "November";
    month[11] = "December";

    funcs.getMonthName = function() {
        return _getMonthName(this.getMonth());
    };

    var _getMonthName = $ax.getMonthName = function(monthNum) {
        return month[monthNum];
    };

    funcs.addYear = function(years) {
        var retVal = new Date(this.valueOf());
        retVal.setFullYear(this.getFullYear() + years);
        return retVal;
    };

    funcs.addMonth = function(months) {
        var retVal = new Date(this.valueOf());
        retVal.setMonth(this.getMonth() + months);
        return retVal;
    };

    funcs.addDay = function(days) {
        var retVal = new Date(this.valueOf());
        retVal.setDate(this.getDate() + days);
        return retVal;
    };

    funcs.addHour = function(hours) {
        var retVal = new Date(this.valueOf());
        retVal.setHours(this.getHours() + hours);
        return retVal;
    };

    funcs.addMinute = function(minutes) {
        var retVal = new Date(this.valueOf());
        retVal.setMinutes(this.getMinutes() + minutes);
        return retVal;
    };

    funcs.addSecond = function(seconds) {
        var retVal = new Date(this.valueOf());
        retVal.setSeconds(this.getSeconds() + seconds);
        return retVal;
    };

    funcs.addMillisecond = function(milliseconds) {
        var retVal = new Date(this.valueOf());
        retVal.setMilliseconds(this.getMilliseconds() + milliseconds);
        return retVal;
    };

    var _stoHandlers = {};

    _stoHandlers.literal = function(sto, scope, eventInfo) {
        return sto.value;
    };

    //need angle bracket syntax because var is a reserved word
    _stoHandlers['var'] = function(sto, scope, eventInfo) {
        var retVal = scope[sto.name] || $ax.globalVariableProvider.getVariableValue(sto.name, eventInfo);
        // Handle desired type here?
        if((sto.desiredType == 'int' || sto.desiredType == 'float')) {
            var num = new Number(retVal);
            retVal = isNaN(num.valueOf()) ? retVal : num;
        }
        return retVal;
    };

    //TODO: Perhaps repeaterId can be detirmined at generation, and stored in the sto info.
    _stoHandlers.item = function(sto, scope, eventInfo, prop) {
        //TODO: Some of this should probably be refactored out soon...
        var repeaterId = eventInfo.repeaterIdOverride || $ax.getParentRepeaterFromScriptId($ax.repeater.getScriptIdFromElementId(eventInfo.srcElement));
        var itemId = eventInfo.itemIdOverride || $ax.repeater.getItemIdFromElementId(eventInfo.srcElement);
        return $ax.repeater.getData(repeaterId, itemId, sto.name, prop);
    };

    _stoHandlers.paren = function(sto, scope, eventInfo) {
        return _evaluateSTO(sto.innerSTO, scope, eventInfo);
    };

    _stoHandlers.fCall = function(sto, scope, eventInfo) {
        //TODO: [mas] handle required type
        var thisObj = _evaluateSTO(sto.thisSTO, scope, eventInfo);
        var args = [];
        for(var i = 0; i < sto.arguments.length; i++) {
            args[i] = _evaluateSTO(sto.arguments[i], scope, eventInfo);
        }
        var fn = thisObj[sto.func] || funcs[sto.func];
        return fn.apply(thisObj, args);
    };

    _stoHandlers.propCall = function(sto, scope, eventInfo) {
        //TODO: [mas] handle required type
        if((sto.prop == 'url' || sto.prop == 'img') && sto.thisSTO.sto == 'item') return _stoHandlers.item(sto.thisSTO, scope, eventInfo, sto.prop);
        var thisObj = _evaluateSTO(sto.thisSTO, scope, eventInfo);
        return thisObj[sto.prop];
    };

    var _binOps = {};
    _binOps['+'] = function(left, right) {
        if(left instanceof Date) return addDayToDate(left, right);
        if(right instanceof Date) return addDayToDate(right, left);
        return Number(left) + Number(right);
    };
    _binOps['-'] = function(left, right) {
        if(left instanceof Date) return addDayToDate(left, -right);
        return left - right;
    };
    _binOps['*'] = function(left, right) { return left * right; };
    _binOps['/'] = function(left, right) { return left / right; };
    _binOps['%'] = function(left, right) { return left % right; };
    _binOps['=='] = function(left, right) { return _getBool(left) == _getBool(right); };
    _binOps['!='] = function(left, right) { return _getBool(left) != _getBool(right); };
    _binOps['<'] = function(left, right) { return left < right; };
    _binOps['<='] = function(left, right) { return left <= right; };
    _binOps['>'] = function(left, right) { return left > right; };
    _binOps['>='] = function(left, right) { return left >= right; };
    _binOps['&&'] = function(left, right) { return _getBool(left) && _getBool(right); };
    _binOps['||'] = function(left, right) { return _getBool(left) || _getBool(right); };

    // TODO: Move this to generic place to be used.
    var addDayToDate = function(date, days) {
        var retVal = new Date(date.valueOf());
        retVal.setDate(date.getDate() + days);
        return retVal;
    };

    var _unOps = {};
    _unOps['+'] = function(arg) { return +arg; };
    _unOps['-'] = function(arg) { return -arg; };
    _unOps['!'] = function(arg) { return !_getBool(arg); };

    _stoHandlers.binOp = function(sto, scope, eventInfo) {
        var left = _evaluateSTO(sto.leftSTO, scope, eventInfo);
        var right = _evaluateSTO(sto.rightSTO, scope, eventInfo);
        return _binOps[sto.op](left, right);
    };

    _stoHandlers.unOp = function(sto, scope, eventInfo) {
        var input = _evaluateSTO(sto.inputSTO, scope, eventInfo);
        return _unOps[sto.op](input);
    };

    var _getBool = function(val) {
        var lowerVal = val.toLowerCase ? val.toLowerCase() : val;
        return lowerVal == "false" ? false : lowerVal == "true" ? true : val;
    };
    $ax.getBool = _getBool;

    var _evaluateSTO = function(sto, scope, eventInfo) {
        if(sto.sto == 'error') return undefined;
        return castSto(_stoHandlers[sto.sto](sto, scope, eventInfo), sto);
    };
    $ax.evaluateSTO = _evaluateSTO;

    var castSto = function(val, sto) {
        var type = sto.computedType || sto.desiredType;
        if(type == 'string') val = String(val);
        else if(type == 'date') val = new Date(val);
        else if(type == 'int' || type == 'float') val = Number(val);
        else if(type == 'bool') val = Boolean(val);

        return val;
    };
});