// 防抖
function debounce(fn, interval) {
  var timer;
  var gapTime = interval || 300;//间隔时间，如果interval不传，则默认1000ms
  return function() {
    clearTimeout(timer);
    var context = this;
    var args = arguments;//保存此处的arguments，因为setTimeout是全局的，arguments不是防抖函数需要的。
    timer = setTimeout(function() {
      fn.call(context,args);
    }, gapTime);//延迟
  };
}
// 模块导出
module.exports = {
  // formatTime,
  debounce
}
// 用法--点击事件:tool.debounce(function(evt){其中的数据 },1500）
