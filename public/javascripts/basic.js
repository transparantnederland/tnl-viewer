var boundDelegates = {},
    eventHandlers = {},
    routeHandlers = {};

function documentReady() {
	initEventHandlers();

	if( location.hash ) handleHash( location.hash.substring( 1 ) );
}

function makeSafe( uri ) {
	return uri.replace( '/', '\\' );
}

function makeUri( string ) {
	return string.replace( '\\', '/' );
}


function hashChange( e ) {
	var hash = location.hash.substring( 1 );
	handleHash( hash );
}

function handleHash( hash ) {
	if( !hash.length ) {
		//reset view
		document.querySelector( 'td.filtertd ul' ).innerText = '';
		document.querySelector( 'td.search-results ul' ).innerText = '';
		document.querySelector( '#pitcontainer' ).innerText = '';
		document.querySelector( 'input#search' ).value = '';
	} else {
		var parts = hash.split('/');
		if( routeHandlers[ parts[ 0 ] ] ) {
			return routeHandlers[ parts.shift() ]( parts );
		}
	}
}

function initEventHandlers(){
  Object.keys( eventHandlers ).forEach( bindHandlersForElement );

  function bindHandlersForElement( nodeSelector ){
    var handlers = eventHandlers[nodeSelector],
        element = nodeSelector instanceof Element ? nodeSelector : document.querySelector( nodeSelector ) ;
    if( element ) Object.keys( handlers ).forEach( bindEvent );
    else Object.keys( handlers ).forEach( bindDelegate );

    function bindEvent( eventName ){
      element.addEventListener( eventName, handlers[eventName] );
    }

    function bindDelegate( eventName ){
      if( !boundDelegates[eventName] ) {
        boundDelegates[eventName] = {};
        document.addEventListener( eventName, createDelegateHandler( eventName ) );
      }
      boundDelegates[ eventName ][ nodeSelector] = handlers[eventName];
    }
  }

  function createDelegateHandler( eventName ) {
    return function delegateEvent(e){
      var delegates = boundDelegates[eventName],
          target = e.target,
          result = true, didAnyCancel;

      while( target && result ){
        didAnyCancel = Object.keys( delegates ).map( evaluateHandler );
        result = !~didAnyCancel.indexOf(false);

        target = target.parentNode;
      }

      function evaluateHandler( nodeSelector ){
        if( target.matches && target.matches( nodeSelector ) ) return delegates[nodeSelector].call( target, e );
      }
    }
  }
}
