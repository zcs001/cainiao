// ******* Flyout MANAGER ******** //
$axure.internal(function($ax) {
    var _flyoutManager = $ax.flyoutManager = {};

    var getFlyoutLabel = function(panelId) {
        return panelId + '_flyout';
    };

    var _unregisterPanel = function(panelId, keepShown) {
        $ax.geometry.unregister(getFlyoutLabel(panelId));
        if(panelToSrc[panelId]) {
            $ax.style.RemoveRolloverOverride(panelToSrc[panelId]);
            delete panelToSrc[panelId];
        }
        if(!keepShown) {
            $ax.action.addAnimation(panelId, function() {
                $ax('#' + panelId).hide();
            });
        }
    };
    _flyoutManager.unregisterPanel = _unregisterPanel;

    var genPoint = $ax.geometry.genPoint;

    var _updateFlyout = function(panelId) {
        var label = getFlyoutLabel(panelId);
        if(!$ax.geometry.polygonRegistered(label)) return;
        var info = $ax.geometry.getPolygonInfo(label);
        var rects = info && info.rects;

        var targetWidget = $ax.getWidgetInfo(panelId);
        rects.target = $ax.geometry.genRect(targetWidget.pagex, targetWidget.pagey, targetWidget.width, targetWidget.height);

        // Src will stay the same, just updating
        $ax.flyoutManager.registerFlyout(rects, panelId, panelToSrc[panelId]);

        if(!$ax.geometry.checkInsideRegion(label)) _unregisterPanel(panelId);
    };
    _flyoutManager.updateFlyout = _updateFlyout;

    var panelToSrc = {};
    var _registerFlyout = function(rects, panelId, srcId) {
        var label = panelId + '_flyout';
        var callback = function(info) {
            // If leaving object or already outside it, then unregister, otherwise just return
            if(!info.exiting && !info.outside) return;
            _unregisterPanel(panelId);
        };
        var points = [];

        var lastSrcId = panelToSrc[panelId];
        if(lastSrcId != srcId) {
            if(lastSrcId) $ax.style.RemoveRolloverOverride(lastSrcId);
            if(srcId) {
                $ax.style.AddRolloverOverride(srcId);
                panelToSrc[panelId] = srcId;
            } else delete panelToSrc[panelId];
        }

        // rects should be one or two rectangles
        if(!rects.src) {
            var rect = rects.target;
            points.push(genPoint(rect.Left, rect.Top));
            points.push(genPoint(rect.Right, rect.Top));
            points.push(genPoint(rect.Right, rect.Bottom));
            points.push(genPoint(rect.Left, rect.Bottom));
        } else {
            var r0 = rects.src;
            var r1 = rects.target;

            // Right left of right, left right of left, top below top, bottom above bottom
            var rlr = r0.Right <= r1.Right;
            var lrl = r0.Left >= r1.Left;
            var tbt = r0.Top >= r1.Top;
            var bab = r0.Bottom <= r1.Bottom;

            var info = { rlr: rlr, lrl: lrl, tbt: tbt, bab: bab };

            if((rlr && lrl) || (tbt && bab)) {
                points = getSmallPolygon(r0, r1, info);
            } else {
                points = getLargePolygon(r0, r1, info);
            }
        }

        $ax.geometry.registerPolygon(label, points, callback, { rects: rects });
    };
    _flyoutManager.registerFlyout = _registerFlyout;

    // This is the reduced size polygon connecting r0 to r1 by means of horizontal or vertical lines.
    var getSmallPolygon = function(r0, r1, info) {
        var points = [];

        // NOTE: currently I make the assumption that if horizontal/vertical connecting lines from the src hit the target
        //        Meaning if horizontal, rlr and lrl are true, and if vertical, tbt and bab are true.

        points.push(genPoint(r1.Left, r1.Top));

        if(!info.tbt) {
            points.push(genPoint(r0.Left, r1.Top));
            points.push(genPoint(r0.Left, r0.Top));
            points.push(genPoint(r0.Right, r0.Top));
            points.push(genPoint(r0.Right, r1.Top));
        }

        points.push(genPoint(r1.Right, r1.Top));

        if(!info.rlr) {
            points.push(genPoint(r1.Right, r0.Top));
            points.push(genPoint(r0.Right, r0.Top));
            points.push(genPoint(r0.Right, r0.Bottom));
            points.push(genPoint(r1.Right, r0.Bottom));
        }

        points.push(genPoint(r1.Right, r1.Bottom));

        if(!info.bab) {
            points.push(genPoint(r0.Right, r1.Bottom));
            points.push(genPoint(r0.Right, r0.Bottom));
            points.push(genPoint(r0.Left, r0.Bottom));
            points.push(genPoint(r0.Left, r1.Bottom));
        }

        points.push(genPoint(r1.Left, r1.Bottom));

        if(!info.lrl) {
            points.push(genPoint(r1.Left, r0.Bottom));
            points.push(genPoint(r0.Left, r0.Bottom));
            points.push(genPoint(r0.Left, r0.Top));
            points.push(genPoint(r1.Left, r0.Top));
        }

        return points;
    };

    // This is the original algorithm that connects the most extream corners to make polygon
    var getLargePolygon = function(r0, r1, info) {
        var points = [];

        // Top lefts
        if(info.tbt) {
            if(!info.lrl) points.push(genPoint(r0.Left, r0.Top));
            points.push(genPoint(r1.Left, r1.Top));
        } else {
            if(info.lrl) points.push(genPoint(r1.Left, r1.Top));
            points.push(genPoint(r0.Left, r0.Top));
        }

        // Top rights
        if(info.tbt) {
            points.push(genPoint(r1.Right, r1.Top));
            if(!info.rlr) points.push(genPoint(r0.Right, r0.Top));
        } else {
            points.push(genPoint(r0.Right, r0.Top));
            if(info.rlr) points.push(genPoint(r1.Right, r1.Top));
        }

        // Bottom rights
        if(info.bab) {
            if(!info.rlr) points.push(genPoint(r0.Right, r0.Bottom));
            points.push(genPoint(r1.Right, r1.Bottom));
        } else {
            if(info.rlr) points.push(genPoint(r1.Right, r1.Bottom));
            points.push(genPoint(r0.Right, r0.Bottom));
        }

        // Bottom Lefts
        if(info.bab) {
            points.push(genPoint(r1.Left, r1.Bottom));
            if(!info.lrl) points.push(genPoint(r0.Left, r0.Bottom));
        } else {
            points.push(genPoint(r0.Left, r0.Bottom));
            if(info.lrl) points.push(genPoint(r1.Left, r1.Bottom));
        }
        return points;
    };
});

// ******* Placeholder Manager ********* //

$axure.internal(function($ax) {
    var _placeholderManager = $ax.placeholderManager = {};
    var idToPlaceholderInfo = {};

    var _registerPlaceholder = function(elementId, text, password) {
        idToPlaceholderInfo[elementId] = { text: text, password: password, active: false };
    };
    _placeholderManager.registerPlaceholder = _registerPlaceholder;

    var _updatePlaceholder = function(elementId, active, clearText) {
        var info = idToPlaceholderInfo[elementId];
        if(!info || info.active == active) return;
        info.active = active;
        $ax.style.SetWidgetPlaceholder(elementId, active, active ? info.text : clearText ? '' : $jobj(elementId).val(), info.password);
    };
    _placeholderManager.updatePlaceholder = _updatePlaceholder;

    var _isActive = function(elementId) {
        var info = idToPlaceholderInfo[elementId];
        return Boolean(info && info.active);
    };
    _placeholderManager.isActive = _isActive;

});