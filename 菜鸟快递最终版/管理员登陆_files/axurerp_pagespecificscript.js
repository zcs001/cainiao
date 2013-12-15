for(var i = 0; i < 8; i++) { var scriptId = 'u' + i; window[scriptId] = document.getElementById(scriptId); }

$axure.eventManager.pageLoad(
function (e) {

});
gv_vAlignTable['u4'] = 'top';gv_vAlignTable['u6'] = 'top';gv_vAlignTable['u7'] = 'top';
u2.style.cursor = 'pointer';
$axure.eventManager.click('u2', function(e) {

if (((GetWidgetText('u0')) == ('admin')) && ((GetWidgetText('u1')) == ('admin'))) {

	self.location.href=$axure.globalVariableProvider.getLinkUrl('管理员页面.html');

}
else
if (((GetWidgetText('u0')) != ('admin')) || ((GetWidgetText('u1')) != ('admin'))) {

	SetPanelVisibility('u5','','none',500);

}
});
gv_vAlignTable['u3'] = 'top';