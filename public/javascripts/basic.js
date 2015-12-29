var boundDelegates = {},
    eventHandlers = {},
    routeHandlers = {},
    ignoreHashChange = false;

function createObjectIterator( method ) {
  return function( fun ) {
    var self = this;

    return Object.keys( self )[ method ]( iterate );

    function iterate( key ) {
      return fun( key, self[ key ], self );
    }
  };
}

Object.prototype.forEach = createObjectIterator( 'forEach' );
Object.prototype.map = createObjectIterator( 'map' );
Object.prototype.filter = createObjectIterator( 'filter' );

document.addEventListener( 'DOMContentLoaded', documentReady );

window.addEventListener( 'hashchange', hashChange );

function documentReady() {
	initEventHandlers();
  setMenuMargin();
  
	if( location.hash ) handleHash( location.hash.substring( 1 ) );
}

function makeSafe( uri ) {
	return encodeURIComponent( uri );
}

function makeUri( string ) {
	return decodeURIComponent( string );
}

function replaceHash( newHash, suppress ) {
	if( suppress ) ignoreHashChange = true;
	location.hash = newHash;
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
  eventHandlers.forEach( bindHandlersForElement );

  function bindHandlersForElement( nodeSelector, handlers ){
    var element = nodeSelector instanceof Element ? nodeSelector : document.querySelector( nodeSelector ) ;
    if( element ) handlers.forEach( element.addEventListener.bind( element ) );
    else handlers.forEach( bindDelegate );

    function bindDelegate( eventName, eventHandler ){
      if( !boundDelegates[ eventName ] ) {
        boundDelegates[ eventName ] = {};
        document.addEventListener( eventName, createDelegateHandler( eventName ) );
      }
      boundDelegates[ eventName ][ nodeSelector] = eventHandler;
    }
  }

  function createDelegateHandler( eventName ) {
    return function delegateEvent(e){
      var delegates = boundDelegates[eventName],
          target = e.target,
          result = true, didAnyCancel;

      while( target && result ){
        didAnyCancel = delegates.map( evaluateHandler );
        result = !~didAnyCancel.indexOf(false);

        target = target.parentNode;
      }

      function evaluateHandler( nodeSelector, delegate ){
        if( target.matches && target.matches( nodeSelector ) ) return delegate.call( target, e );
      }
    };
  }
}

function instantiateTemplate( templateSelector, data ) {
  var node = document.importNode( document.querySelector( templateSelector ).content, true );

  data.forEach( setChildElement );

  return node;

  function setChildElement( key, value ) {
    var type = typeof value,
        element = node.querySelector( key );
    
    if( type === 'string' || type === 'number' ) {
      element.innerHTML = value;
      return;
    }

    if( type === 'function' ) {
      return value( element );
    }

    if( value && value.template ) {
      value.list.forEach( appendChild );
      return;
    }

    value && value.forEach( setElementProperty );

    function setElementProperty( key, subValue ) {
      if( /data-/.exec( key ) ) return element.dataset[ key.slice( 5 ) ] = subValue;
      element[ key ] = subValue;
    }

    function appendChild( item ) {
      var values = {};

      if( value.convert ) values = value.convert( item );
      else if( value.mapping ) value.mapping.forEach( declareValue );
      else values = item;

      return element.appendChild( instantiateTemplate( value.template, values ) );

      function declareValue( key, property ) {
        values[ key ] = item[ property ];
      }
    }
  }
}

function resolveOnObject(object, path, value){
  var parts = path.split( '.' ),
      ref = object,
      part;

  while( parts.length > 1 && ref){
    part = parts.shift();
    ref = ref[part];
  }

  if(!ref) throw('declareOnObject: object does not contain ' + part + ', full path given: ' + path);

  part = parts.shift();

  if(value !== undefined) ref[part] = value;
  
  return ref[part];
}

function unsetOnObject( object, path ) {
  var parts = path.split( '.' ),
      ref = object,
      part;

  while( parts.length > 1 && ref){
    part = parts.shift();
    ref = ref[part];
  }

  if(!ref) throw('declareOnObject: object does not contain ' + part + ', full path given: ' + path);

  part = parts.shift();

  return delete ref[part];
}

function setMenuMargin(){
  var headerHeight = document.querySelector('.searchSection').offsetHeight;
  document.querySelector(".filtertd").style.marginTop = headerHeight + 'px';
  document.querySelector(".searchResults").style.top = headerHeight + 'px';
  console.log(headerHeight);
}
