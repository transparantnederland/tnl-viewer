var apiUrl = '//api.transparantnederland.nl/search';

document.addEventListener( 'clear', clear );

eventHandlers[ 'input#search' ] = {
	keyup: searchKeyUp,
	blur: searchBlur
};
eventHandlers[ 'input[type=checkbox].filter' ] = { change: toggleFilter };

routeHandlers.pit = pitHandler;
routeHandlers.search = searchHandler;

function clear() {
	document.querySelector( 'td.filtertd ul' ).innerText = '';
	document.querySelector( 'td.search-results ul' ).innerText = '';
	document.querySelector( '#pitcontainer' ).innerText = '';
	document.querySelector( 'input#search' ).value = '';
}

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

function searchBlur() {
	location.hash = 'search/' + makeSafe( document.querySelector( 'input#search' ).value );
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

function search( append, string ){
	ajaxRequest(
		apiUrl,
		{ q: ( string || document.querySelector( 'input#search' ).value ) + ( append ? append : '' ) },
		function( results ) {
			searchResults = results;
			filteredResults = searchResults;

			filters = {}; //reset filters from previous searches
			updateFilters();
			applyFilters();
			showFilters();
			showSearchResults();
		}
	);
}

function updateFilters() {
	filterableProperties.forEach( function( key ) {
		var list = filters[ key ] = filters[ key ] || {};

		Object.keys( list ).forEach( function( key ) {
			list[ key ].count = 0; //reset count
		} );

		filteredResults.forEach( function( pit ) {
			var value = pit[ key ],
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
	container.innerHTML = '<h3>filter de resultaten:</h3>';
	
	Object.keys( filters ).forEach( function( key ) {
		var filterGroup = createFilterGroup( key, filters[ key ] );
		if( filterGroup ) container.appendChild( filterGroup );
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

	if( !ul.children.length || ul.children.length === 1 ) return;
	
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

	filteredResults = searchResults.filter( function( pit ) {
		var filtered = false;

		Object.keys( allowedPropertiesByKey ).forEach( function( key ){
			var list = allowedPropertiesByKey[ key ];
			filtered = filtered || list.indexOf( pit[ key ] ) === -1;
		} );

		return !filtered;
	} );
}

function showSearchResults(){
	var container = document.querySelector( 'ul#search-results ');
	container.innerText = '';

	if( !filteredResults.length ) {
		container.innerText = 'geen resultaten';
		return;
	}

	filteredResults.forEach( function( pit ) {
		container.appendChild( createSearchResult( pit ) );
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



function pitHandler( routeParts ) {
	// get back the original pit uri
	var pitId = routeParts[ 0 ] = makeUri( routeParts[ 0 ] );

	if( routeParts.length === 1 ){
		getPit( pitId, showPit );
	}
}

function searchHandler( routeParts ) {
	var searchQuery = makeUri( routeParts.pop() );
	search( '*', searchQuery );
}

function getPit( pitId, cb ) {
	ajaxRequest(
		apiUrl,
		{ id: pitId },
		function( pits ) {
			if( pits && pits.length ) {
				cb( null, pits[ 0 ] );
			} else {
				cb( 'an error has occurred' );
			}
		}
	);
}

function showPit( err, pit ) {
	if( err ) showError( err );
	document.querySelector( 'input#search' ).value = '';

	var template = document.querySelector( '#pit' ),
			node = document.importNode( template.content, true ),
			pitContainer = document.querySelector( '#pitcontainer' );

	if( !pit ) return showError( 'no pit found' );

	node.querySelector( 'h2' ).textContent = pit.name;
	node.querySelector( 'span.sourcetext' ).textContent = pit.dataset;

	pitContainer.innerText = '';
	document.querySelector( 'td.filtertd ul' ).innerText = '';
	document.querySelector( 'td.search-results ul' ).innerText = '';

	pitContainer.appendChild( node );
}
