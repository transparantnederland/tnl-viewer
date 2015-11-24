var apiUrl = '//transparantnederland.nl:3001/search',
		boundDelegates = {},
    eventHandlers = {},
    routeHandlers = {},
		searchField;

document.addEventListener( 'DOMContentLoaded', documentReady );

window.addEventListener( 'hashchange', hashChange );

eventHandlers[ 'input#search' ] = { keyup: searchKeyUp };
eventHandlers['button#submit-search'] = { click: search };
eventHandlers[ 'input[type=checkbox].filter' ] = { change: toggleFilter };

routeHandlers[ 'pit' ] = pitHandler;

function searchKeyUp( e ) {
	if( e.keyCode === 13 ) {
		return search();
	}

	if( e.keyCode === 38 || e.keyCode === 40 ) return;

	if( e.target.value.length > 1 ) {
		return search( '*' );
		ajaxRequest( apiUrl, { q: e.target.value + '*' }, function( data ) {
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

function toggleFilter( e ) {
	var key = this.dataset.filterkey,
			value = this.dataset.filtervalue,
			state = this.checked;

	filters[ key ][ value ].value = state;
	
	applyFilters();
	updateFilters();
	showFilters();
	showSearchResults();
}

var filterableProperties = [
			'type',
			'dataset'
		],
		filters = {},
		searchResults,
		filteredResults;

function search( append ){
	ajaxRequest( apiUrl, { q: document.querySelector( 'input#search' ).value + ( append ? append : '' ) }, function( data ) {
		searchResults = data.features;
		filteredResults = data.features.slice();

		updateFilters();
		applyFilters();
		showFilters();
		showSearchResults();
	} );
}

function updateFilters() {
	filterableProperties.forEach( function( key ) {
		var list = filters[ key ] = filters[ key ] || {};

		Object.keys( list ).forEach( function( key ) {
			list[ key ].count = 0; //reset count
		} );

		filteredResults.forEach( function( feature ) {
			var pit0 = feature.properties.pits[0],
					value = pit0[ key ],
					item = list[ value ],
					storedValue;

			if( item ) {
				storedValue = item.value;
			} else item = list[ value ] = { count: 0 };

			item.value = storedValue || false;
			item.count++;
		} );
	} );
}

function showFilters() {
	var container = document.querySelector( 'ul#filtercontainer' );
	container.innerText = '';
	
	Object.keys( filters ).forEach( function( key ) {
		container.appendChild( createFilterGroup( key, filters[ key ] ) );
	} );
}

function createFilterGroup( key, properties ) {
	var	template = document.querySelector( '#filtergroup' ),
			node = document.importNode( template.content, true ),
			ul = node.querySelector( 'ul' );

	node.querySelector( 'h3' ).textContent = key;

	Object.keys( properties ).forEach( function( name ) {
		var child = createFilterItem( name, properties[ name ] );
		if( child ) ul.appendChild( child );

		function createFilterItem( name, info ) {

			var template = document.querySelector( '#filteritem' ),
					node = document.importNode( template.content, true ),
					input = node.querySelector( 'input' );
			
			input.checked = info.value ? 'checked' : '';
			input.dataset.filterkey = key;
			input.dataset.filtervalue = name;

			node.querySelector( '.name' ).textContent = name;
			node.querySelector( '.count' ).textContent = info.count;

			if( !info.count ) {
				node.children[ 0 ].classList.add( 'disabled' );
				input.disabled = 'disabled';
			}

			return node;
		}
	} );
	
	return node;
}

function applyFilters(){
	var allowedPropertiesByKey = {};
	
	Object.keys( filters ).forEach( function( key ) {
		var list = filters[ key ];

		allowedPropertiesByKey[ key ] = [];

		Object.keys( list ).forEach( function( property ) {
			if( list[ property ].value ) allowedPropertiesByKey[ key ].push( property );
		} );

		if( !allowedPropertiesByKey[ key ].length ) delete allowedPropertiesByKey[ key ];
	} );

	filteredResults = searchResults.filter( function( feature ) {
		var filtered = false;

		Object.keys( allowedPropertiesByKey ).forEach( function( key ){
			var list = allowedPropertiesByKey[ key ];
			filtered = filtered || list.indexOf( feature.properties.pits[ 0 ][ key ] ) === -1;
		} );

		return !filtered;
	} );
}

function showSearchResults(){
	var container = document.querySelector( 'ul#search-results ');
	container.innerText = '';

	filteredResults.forEach( function( feature ) {
		var pit0 = feature.properties.pits[0];
		
		container.appendChild( createSearchResult( pit0 ) );
	} );
}

function createSearchResult( pit ) {
	var template = document.querySelector( '#searchresult' ),
			node = document.importNode( template.content, true ),
			anchor = node.querySelector( 'h3 a' );

	anchor.textContent = pit.name;
	anchor.href = '#' + 'pit/' + makeSafe( pit.id );
	node.querySelector( 'span.typetext' ).textContent = pit.type;
	node.querySelector( 'span.sourcetext' ).textContent = pit.dataset;

	return node;
}

function makeSafe( uri ) {
	return uri.replace( '/', '\\' );
}

function makeUri( string ) {
	return string.replace( '\\', '/' );
}

function documentReady() {
	initEventHandlers();

	searchField = document.getElementById('search');

	if( location.hash ) handleHash( location.hash.substring( 1 ) );
}

function hashChange( e ) {
	var hash = location.hash.substring( 1 );
	handleHash( hash );
}

function handleHash( hash ) {
	if( !hash.length ) {
		//reset view
		document.querySelector( 'td.filtertd' ).innerText = '';
		document.querySelector( 'td.search-results' ).innerText = '';
		document.querySelector( '#pitcontainer' ).innerText = '';
		document.querySelector( 'input#search' ).value = '';
	} else {
		var parts = hash.split('/');
		if( routeHandlers[ parts[ 0 ] ] ) {
			return routeHandlers[ parts.shift() ]( parts );
		}
	}
}

function pitHandler( routeParts ) {
	// get back the original pit uri
	var pitId = routeParts[ 0 ] = makeUri( routeParts[ 0 ] );

	if( routeParts.length === 1 ){
		getPit( pitId, showPit );
	}
}

function getPit( pitId, cb ) {
	ajaxRequest( 'http://transparantnederland.nl:3001/search', { id: pitId }, function( data ) {
		if( data && data.features && data.features.length ) {
			cb( null, data.features[ 0 ] );
		} else {
			cb( 'an error has occurred' );
		}
	} );
}

function showPit( err, feature ) {
	if( err ) showError( err );
	document.querySelector( 'input#search' ).value = '';

	var template = document.querySelector( '#pit' ),
			node = document.importNode( template.content, true ),
			pit0 = feature.properties.pits[ 0 ],
			pitContainer = document.querySelector( '#pitcontainer' );

	if( !pit0 ) return showError( 'no pit found' );

	node.querySelector( 'h2' ).textContent = pit0.name;
	node.querySelector( 'span.sourcetext' ).textContent = pit0.dataset;

	pitContainer.innerText = '';
	document.querySelector( 'td.filtertd' ).innerText = '';
	document.querySelector( 'td.search-results' ).innerText = '';

	pitContainer.appendChild( node );
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
