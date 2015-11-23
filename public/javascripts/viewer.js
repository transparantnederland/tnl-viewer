var apiUrl = '//transparantnederland.nl:3001/search',
		boundDelegates = {},
    eventHandlers = {},
		searchField;

document.addEventListener( 'DOMContentLoaded', documentReady );

eventHandlers[ 'input#search' ] = { keyup: searchKeyUp };
eventHandlers['button#submit-search'] = { click: search };
eventHandlers[ 'input[type=checkbox].filter' ] = { change: toggleFilter };

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
			'dataset',
			'name'
		],
		filters = {},
		searchResults,
		filteredResults;

function search(){
	ajaxRequest( apiUrl, { q: document.querySelector( 'input#search' ).value }, function( data ) {
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
			if( !info.count ) return;

			var template = document.querySelector( '#filteritem' ),
					node = document.importNode( template.content, true ),
					input = node.querySelector( 'input' );
			
			input.checked = info.value ? 'checked' : '';
			input.dataset.filterkey = key;
			input.dataset.filtervalue = name;

			node.querySelector( '.name' ).textContent = name;
			node.querySelector( '.count' ).textContent = info.count;

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
			node = document.importNode( template.content, true );

	node.querySelector( 'h3 a' ).textContent = pit.name;
	node.querySelector( 'span.typetext' ).textContent = pit.type;
	node.querySelector( 'span.sourcetext' ).textContent = pit.dataset;

	return node;
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
