var apiUrl = '//transparantnederland.nl:3001/search',
		boundDelegates = {},
    eventHandlers = {},
		searchField;

document.addEventListener( 'DOMContentLoaded', documentReady );

eventHandlers[ 'input#search' ] = { keyup: searchKeyUp };
eventHandlers['button#submit-search'] = { click: search };

function searchKeyUp( e ) {
	if( e.keyCode === 13 ) {
		return search();
	}

	if( e.keyCode === 38 || e.keyCode === 40 ) return;

	if( e.target.value.length > 1 ) {
		ajaxRequest( apiUrl, { q: e.target.value }, function( data ) {
			var dataList = document.querySelector( 'datalist#autosuggest' );
			dataList.innerHTML = '';

			if( data.features ) {
				data.features.forEach( function( feature ) {
					var firstPit = feature.properties.pits[ 0 ],
							name = firstPit && firstPit.name,
							option = document.createElement( 'option' );

					if( name ) {
						option.value = name;
						dataList.appendChild( option );
					}
				} );
			}
		} );
	}
}

function search(){
	ajaxRequest( apiUrl, { q: document.querySelector( 'input#search' ).value }, function( data ) {
		var container = document.querySelector( 'ul#search-results ');

		if( data.features ) data.features.forEach( function( feature ) {
			container.appendChild( createSearchResult( feature ) );
		} );
	} );
}

function createSearchResult( feature ) {
	var template = document.querySelector( '#searchresult' ),
			anchor = template.content.querySelector( 'h3 a' ),
			typeText = template.content.querySelector( 'span.typetext' ),
			sourceText = template.content.querySelector( 'span.sourcetext' );

	anchor.textContent = feature.properties.pits[0].name;
	typeText.textContent = feature.properties.pits[ 0 ].type;
	sourceText.textContent = feature.properties.pits[ 0 ].dataset;

	return document.importNode( template.content, true );
}

function documentReady() {
	console.log('document ready!');

	initEventHandlers();

	searchField = document.getElementById('search');
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
