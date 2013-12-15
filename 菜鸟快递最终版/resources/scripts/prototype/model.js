// ******* Object Model ******** //
$axure.internal(function($ax) {
    var _implementations = {};

    var _initializeObject = function(type, obj) {
        $.extend(obj, _implementations[type]);
    };
    $ax.initializeObject = _initializeObject;

    var _model = $ax.model = {};

    _model.idsInRdo = function(rdoId) {
        // TODO: What if rdoId is elementId?
        var path = $ax.getPathFromScriptId(rdoId);

        var elementIds = [];
        $ax('*').each(function(obj, elementId) {
            // Don't do other rdos
            if(obj.type == 'referenceDiagramObject') return;

            var elementPath = $ax.getPathFromScriptId($ax.repeater.getScriptIdFromElementId(elementId));
            if(elementPath.length <= path.length) return;
            for(var i = 0; i < path.length; i++) if(elementPath[i] != path[i]) return;
            elementIds.push(elementId);
        });
        return elementIds;
    };

});