for(var i = 0; i < 3; i++) { var scriptId = 'u' + i; window[scriptId] = document.getElementById(scriptId); }

$axure.eventManager.pageLoad(
function (e) {

});
gv_vAlignTable['u0'] = 'top';
$axure.eventManager.keyup('u1', function(e) {

if (true) {

	var obj1 = document.getElementById("u2");
    obj1.disabled = false;

}
});

u2.style.cursor = 'pointer';
$axure.eventManager.click('u2', function(e) {

if (true) {

	self.location.href=$axure.globalVariableProvider.getLinkUrl('页面_2.html');

}
});
