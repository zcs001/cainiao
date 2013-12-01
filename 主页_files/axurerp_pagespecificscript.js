for(var i = 0; i < 8; i++) { var scriptId = 'u' + i; window[scriptId] = document.getElementById(scriptId); }

$axure.eventManager.pageLoad(
function (e) {

});
gv_vAlignTable['u4'] = 'top';
u5.style.cursor = 'pointer';
$axure.eventManager.click('u5', function(e) {

if (true) {

	self.location.href=$axure.globalVariableProvider.getLinkUrl('页面_2.html');

}
});

u6.style.cursor = 'pointer';
$axure.eventManager.click('u6', function(e) {

if (true) {

	self.location.href=$axure.globalVariableProvider.getLinkUrl('页面_3.html');

}
});

u7.style.cursor = 'pointer';
$axure.eventManager.click('u7', function(e) {

if (true) {

	self.location.href=$axure.globalVariableProvider.getLinkUrl('页面_2.html');

}
});
gv_vAlignTable['u0'] = 'top';
$axure.eventManager.keyup('u1', function(e) {

if (true) {

	var obj1 = document.getElementById("u3");
    obj1.disabled = false;

}
});
gv_vAlignTable['u2'] = 'top';
$axure.eventManager.keyup('u3', function(e) {

if (true) {

	var obj1 = document.getElementById("u5");
    obj1.disabled = false;

}
});
