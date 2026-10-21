
// Early stubs so inline onclick="gotoPage(...)" and onclick="demoLogin(...)"
// work even before the main script block has executed.
(function(){
  function makeStub(name){
    var q=[];
    window[name]=function(){
      var args=Array.prototype.slice.call(arguments);
      if(window['_real_'+name]) window['_real_'+name].apply(window,args);
      else q.push(args);
    };
    window['_drain_'+name]=function(fn){
      window['_real_'+name]=fn;
      window[name]=fn;
      q.forEach(function(a){fn.apply(window,a);});
    };
  }
  makeStub('gotoPage');
  makeStub('demoLogin');
})();
