var searchResults;

eventHandlers[ 'input#search' ] = {
	keyup: searchKeyUp,
	blur: searchBlur
};

routeHandlers.search = searchHandler;

filterableProperties[ 'search-results' ] = {
	type: 'pit.type',
	bron: 'pit.dataset'
};

filterCallbacks[ 'search-results' ] = showSearchResults;

function searchKeyUp( e ) {
	if( e.keyCode === 38 || e.keyCode === 40 ) return;

	document.body.scrollTop = 0;

	if( e.keyCode === 13 ) {
		return search();
	}

	if( e.target.value.length > 1 ) {
		return search( '*' );
	}
}

function searchBlur() {
	var value = document.querySelector( 'input#search' ).value,
			safeValue = makeSafe( value ),
			hash = 'search/' + safeValue;

	if( !value || location.hash === hash ) return;

	replaceHash( hash, true );
}

function searchHandler( routeParts ) {
	var searchQuery = makeUri( routeParts.pop() );
	search( '*', searchQuery );
}

function search( append, string ){
	var searchString = ( string || document.querySelector( 'input#search' ).value ) + ( append ? append : '' );

	ajaxRequest(
		apiUrl + 'search',
		{ q: searchString },
		function( results ) {
			var filterTargetName = 'search-results',
					filterables = filterableItems[ filterTargetName ] = results,
					filtered = filteredItems[ filterTargetName ] = results;

			filters = {}; //reset filters from previous searches
			updateFilters( filtered, filterTargetName );
			applyFilters( filterTargetName );
			showFilters( filterTargetName );
			showSearchResults();
		}
	);
}

function showSearchResults(){
	var items = filteredItems[ 'search-results' ],
			container = document.querySelector( 'td.result'),
			ul = document.createElement( 'ul' );

	container.innerHTML = '';
	ul.id = 'search-results';

	if( !items.length ) {
		container.innerText = 'geen resultaten';
		return;
	}

	items.forEach( appendConcept );

	container.appendChild( ul );
	return;

	function appendConcept( concept ) {
		var names = [],
				sources = [],
				type = concept[ 0 ].pit.type,
				id = concept[ 0 ].pit.id;

		concept.forEach( extractShowableData );

		return ul.appendChild( instantiateTemplate( '#searchresult', {
			'h3 a': {
				textContent: names.join(', '),
				href: '#pit/' + makeSafe( id )
			},
			'span.sourcetext': sources.map( makeDatasetLink ).join(', '),
			'span.typetext': type
		} ) );

		function extractShowableData( pitContainer ) {
			var pit = pitContainer.pit;

			if( names.indexOf( pit.name ) === -1 ) names.push( pit.name );
			if( sources.indexOf( pit.dataset ) === -1 ) sources.push( pit.dataset );
		}

		function makeDatasetLink( datasetName ) {
			return '<a href="#dataset/' + datasetName + '">' + datasetName + '</a>';
		}
	}
}
