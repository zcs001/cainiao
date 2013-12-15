for(var i = 0; i < 11; i++) { var scriptId = 'u' + i; window[scriptId] = document.getElementById(scriptId); }

$axure.eventManager.pageLoad(
function (e) {

});
gv_vAlignTable['u4'] = 'top';
u5.style.cursor = 'pointer';
$axure.eventManager.click('u5', function(e) {

if ((GetWidgetText('u3')) == ('123')) {

	self.location.href=$axure.globalVariableProvider.getLinkUrl('登录主.html');

}
else
if ((GetWidgetText('u3')) != ('123')) {

	SetPanelVisibility('u9','','none',500);

}
});

u6.style.cursor = 'pointer';
$axure.eventManager.click('u6', function(e) {

if (true) {

	self.location.href=$axure.globalVariableProvider.getLinkUrl('注册页面.html');

}
});
gv_vAlignTable['u10'] = 'top';gv_vAlignTable['u8'] = 'center';gv_vAlignTable['u0'] = 'top';
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
