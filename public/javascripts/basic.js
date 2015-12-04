var boundDelegates = {},
    eventHandlers = {},
    routeHandlers = {},
    ignoreHashChange = false;

document.addEventListener( 'DOMContentLoaded', documentReady );

window.addEventListener( 'hashchange', hashChange );

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
	if( !ignoreHashChange ) handleHash( hash );
	ignoreHashChange = false;
}

function handleHash( hash ) {
	document.dispatchEvent( new Event('clear') );

	if( hash.length ) {
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
    };
  }
}
