$axure.internal(function($ax) {

    $(window.document).ready(function() {
        //this is because the page id is not formatted as a guid
        var pageId = $ax.pageData.page.packageId;

        var pageData = {
            id: pageId,
            pageName: $ax.pageData.page.name,
            location: window.location.toString(),
            notes: $ax.pageData.page.notes
        };

        //only trigger the page.data setting if the window is on the mainframe
        if(window.name == 'mainFrame' ||
            (!CHROME_5_LOCAL && window.parent.$ && window.parent.$('#mainFrame').length > 0)) {
            $axure.messageCenter = $axure.messageCenter;
            $axure.messageCenter.setState('page.data', pageData);
        }

        $ax(function(diagramObject) {
            return diagramObject.style.opacity && !diagramObject.isContained;
        }).each(function(diagramObject, elementId) {
            $ax.style.applyOpacityFromStyle(elementId, diagramObject.style);
        });


        $('input[type=text], input[type=password], textarea').focus(function() {
            window.lastFocusedControl = this;
        });

        $('iframe').each(function() {
            var origSrc = $(this).attr('basesrc');

            if(origSrc) {
                var newSrcUrl = origSrc.toLowerCase().indexOf('http://') == -1 ? $ax.globalVariableProvider.getLinkUrl(origSrc) : origSrc;

                $(this).attr('src', newSrcUrl);
            }
        });

        $axure.messageCenter.addMessageListener(function(message, data) {
            if(message == 'setGlobalVar') {
                $ax.globalVariableProvider.setVariableValue(data.globalVarName, data.globalVarValue, true);
            }
        });

        var lastFocusedClickable;
        var shouldOutline = true;

        $ax(function(dObj) { return dObj.tabbable; }).each(function(dObj, elementId) {
            var focusableId = $ax.event.getFocusableWidgetOrChildId(elementId);
            $('#' + focusableId).attr("tabIndex", 0);
        });

        $('div[tabIndex=0], img[tabIndex=0]').bind($ax.features.eventNames.mouseDownName, function() {
            shouldOutline = false;
        });

        $(window.document).bind($ax.features.eventNames.mouseUpName, function() {
            shouldOutline = true;
        });

        $('div[tabIndex=0], img[tabIndex=0], a').focus(function() {
            if(shouldOutline) {
                $(this).css('outline', '');
            } else {
                $(this).css('outline', 'none');
            }

            lastFocusedClickable = this;
        });

        $('div[tabIndex=0], img[tabIndex=0], a').blur(function() {
            if(lastFocusedClickable == this) lastFocusedClickable = null;
        });

        $(window.document).bind('keyup', function(e) {
            if(e.keyCode == '13' || e.keyCode == '32') {
                if(lastFocusedClickable) $(lastFocusedClickable).click();
            }
            ;
        });

        $ax(function(dObj) { return dObj.submitButton; }).each(function(dObj, elementId) {
            $('#' + elementId).keyup(function(event) {
                if(event.keyCode == '13') {
                    $('#' + dObj.submitButton).click();
                }
                ;
            }).keydown(function(event) {
                if(event.keyCode == '13') {
                    event.preventDefault();
                }
            });
        });

        if($ax.document.configuration.hideAddress) {
            $(window).load(function() {
                window.setTimeout(function() {
                    window.scrollTo(0, 0.9);
                }, 0);
            });
        }

        if($ax.document.configuration.preventScroll) {
            $(window.document).bind('touchmove', function(event) {
                var inScrollable = $ax.legacy.GetScrollable(event.target) != window.document.body;
                if(!inScrollable) {
                    event.preventDefault();
                }
            });

            $ax(function(diagramObject) {
                return diagramObject.type == 'dynamicPanel' && diagramObject.scrollbars != 'none';
            }).$().children().bind('touchstart', function() {
                var target = this;
                var top = target.scrollTop;
                if(top <= 0) target.scrollTop = 1;
                if(top + target.offsetHeight >= target.scrollHeight) target.scrollTop = target.scrollHeight - target.offsetHeight - 1;
            });
        }
        
        if (OS_MAC && WEBKIT) {
            $ax(function (diagramObject) {
                return diagramObject.type == 'comboBox';
            }).$().css('-webkit-appearance', 'menulist-button').css('border-color', '#999999');
        }

        $ax.legacy.BringFixedToFront();
        $ax.event.initialize();
        $ax.visibility.initialize();
        $ax.adaptive.initialize();
        $ax.loadDynamicPanelsAndMasters();
        $ax.repeater.init();
    });

});

/* extend canvas */
var gv_hasCanvas = false;
(function() {
    var _canvas = document.createElement('canvas'), proto, abbrev;
    if(gv_hasCanvas = !!(_canvas.getContext && _canvas.getContext('2d')) && typeof (CanvasGradient) !== 'undefined') {
        function chain(func) {
            return function() {
                return func.apply(this, arguments) || this;
            };
        }

        with(proto = CanvasRenderingContext2D.prototype) for(var func in abbrev = {
            a: arc,
            b: beginPath,
            n: clearRect,
            c: clip,
            p: closePath,
            g: createLinearGradient,
            f: fill,
            j: fillRect,
            z: function(s) { this.fillStyle = s; },
            l: lineTo,
            w: function(w) { this.lineWidth = w; },
            m: moveTo,
            q: quadraticCurveTo,
            h: rect,
            r: restore,
            o: rotate,
            s: save,
            x: scale,
            y: function(s) { this.strokeStyle = s; },
            u: setTransform,
            k: stroke,
            i: strokeRect,
            t: translate
        }) proto[func] = chain(abbrev[func]);
        CanvasGradient.prototype.a = chain(CanvasGradient.prototype.addColorStop);
    }
})();
