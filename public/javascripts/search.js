var searchResults;

eventHandlers[ 'input#search' ] = {
	keyup: searchKeyUp,
	blur: searchBlur,
	focus: searchFocus
};

routeHandlers.search = searchHandler;

filterableProperties[ 'search-results' ] = {
	type: 'pit.type',
	bron: 'pit.dataset'
};

filterCustomLabelDictionairies[ 'search-results' ] = {
	type: pitTypesReadableNames
};

filterCallbacks[ 'search-results' ] = showSearchResults;

function searchKeyUp( e ) {
	if( e.keyCode === 38 || e.keyCode === 40 ) return;

	document.body.scrollTop = 0;

	if( e.keyCode === 13 ) {
		document.querySelector( 'input#search' ).blur();
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

function searchFocus() {
	document.querySelector( 'input#search' ).value = '';
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
				id = concept[ 0 ].pit.id,
				name, instructions;

		concept.forEach( extractShowableData );

		name = names.shift();

		instructions = {
			'h3 a': {
				textContent: name,
				href: '#pit/' + makeSafe( id )
			},
			'p.type': pitTypesReadableNames[ type ],
			'p.source span.label': ( sources.length === 1 ? 'bron' : 'bronnen' ) + ': ',
			'p.source span.sourcetext': sources.map( makeDatasetLink ).join(', ')
		};

		if( names.length ) {
			instructions[ 'span.othernames' ] = names.join(', ');
		} else instructions[ 'p.morenames' ] = '';

		return ul.appendChild( instantiateTemplate( '#searchresult', instructions ) );

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
