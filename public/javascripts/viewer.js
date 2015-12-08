var apiUrl = 'https://api.transparantnederland.nl/';

document.addEventListener( 'clear', clear );

eventHandlers[ 'input#search' ] = {
	keyup: searchKeyUp,
	blur: searchBlur
};
eventHandlers[ 'input[type=checkbox].filter' ] = { change: toggleFilter };

routeHandlers.pit = pitHandler;
routeHandlers.search = searchHandler;
routeHandlers.dataset = datasetHandler;

function clear() {
	document.querySelector( 'td.filtertd ul' ).innerText = '';
	document.querySelector( 'td.result' ).innerText = '';
	document.querySelector( 'input#search' ).value = '';
}

function searchKeyUp( e ) {
	if( e.keyCode === 13 ) {
		return search();
	}

	if( e.keyCode === 38 || e.keyCode === 40 ) return;

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
	var searchString = ( string || document.querySelector( 'input#search' ).value ) + ( append ? append : '' );

	ajaxRequest(
		apiUrl + 'search',
		{ q: searchString },
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
	var container = document.querySelector( 'td.result');
	container.innerText = '';

	var ul = document.createElement( 'ul' );
	ul.id = 'search-results';

	if( !filteredResults.length ) {
		container.innerText = 'geen resultaten';
		return;
	}

	filteredResults.forEach( function( pit ) {
		ul.appendChild( createSearchResult( pit ) );
	} );

	container.appendChild( ul );
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
		getPit( pitId, function( err, pit ) {
			getRelations( pit, function( err, relatedPits ) {
				showPit( err, pit, relatedPits );
			} );
		} );
	} else if( routeParts[ 1 ] === 'network' ) {
		getPit( pitId, function( err, pit ) {
			ajaxRequest(
				apiUrl + 'peopleFromOrgsFromPerson',
				{ id: pitId },
				function( network ) {
					showNetwork( null, pit, network );
				}
			);
		} );
	}
}

function searchHandler( routeParts ) {
	var searchQuery = makeUri( routeParts.pop() );
	search( '*', searchQuery );
}

function datasetHandler( routeParts ) {
	var datasetId = routeParts[ 0 ] = makeUri( routeParts[ 0 ] );

	if( routeParts.length === 1 ) {
		return ajaxRequest(
			apiUrl + 'datasets/' + datasetId,
			showDataset
		);
	}
}

function clearScreen() {
	document.querySelector( 'td.filtertd ul' ).innerText = '';
	document.querySelector( 'td.result' ).innerText = '';
}

function getPit( pitId, cb ) {
	ajaxRequest(
		apiUrl + 'search',
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

function getRelations( pit, cb ) {
	var enrichRoute = pit.type === 'tnl:Person' ? 'orgsFromPerson' : 'peopleFromOrg';

	return ajaxRequest(
		apiUrl + enrichRoute,
		{ id: pit.id },
		function( relatedPits ) {
			cb( null, relatedPits );
		}
	);
}

var pitPropertiesBlacklist = [
			'id',
			'dataset',
			'person',
			'systemId',
			'type'
		];

function showPit( err, pit, relatedPits ) {
	if( err ) return showError( err );
	document.querySelector( 'input#search' ).value = '';

	var template = document.querySelector( '#pit' ),
			node = document.importNode( template.content, true ),
			datasetAnchor = node.querySelector( 'a.sourcetext' ),
			propertiesTBody = node.querySelector( 'table.properties tbody' ),
			relationsTBody = node.querySelector( 'table.related-pits tbody' ),
			allRelations;

	if( !pit ) return showError( 'no pit found' );

	node.querySelector( 'h2' ).innerText = pit.name;
	datasetAnchor.innerText = pit.dataset;
	datasetAnchor.href = '#dataset/' + pit.dataset;

	Object.keys( pit ).forEach( function( parent, key ) {
		if( pitPropertiesBlacklist.indexOf( key ) > -1 ) return;

		var node = document.importNode( document.querySelector( '#property' ).content, true ),
				value = parent[ key ];

		if( key === 'data' ) return Object.keys( parent.data ).forEach( arguments.callee.bind( null, parent.data ) );

		node.querySelector( 'td.property-name' ).innerText = key;
		node.querySelector( 'td.property-value' ).innerHTML = /^http/.exec( value ) ? '<a href="' + value + '">' + value + '</a>' : value;

		propertiesTBody.appendChild( node );
	}.bind(null, pit) );

	node.querySelector( 'table.related-pits thead td.type' ).innerText = pit.type === 'tnl:Person' ? 'Organisatie' : 'Persoon';

	relatedPits.forEach( function( relatedPit ) {
		relationsTBody.appendChild( makeRelatedPitRow( relatedPit ) );
	} );

	if( pit.type === 'tnl:Person' ) {
		allRelations = node.querySelector( 'a.all-relations' );
		allRelations.innerText = 'alle relaties tonen';
		allRelations.href = location.hash + '/network';
	}

	clearScreen();

	document.querySelector( 'table#search-table td.result' ).appendChild( node );
}

function showNetwork( err, pit, relatedPits ) {
	if( err ) return showError( err );
	
	var template = document.querySelector( '#network' ),
			node = document.importNode( template.content, true ),
			tbody = node.querySelector( 'table.related-pits tbody' );

	node.querySelector( 'h2' ).innerText = pit.name;

	relatedPits.forEach( function( relatedPit ) {
		tbody.appendChild( makeRelatedPitRow( relatedPit ) );
	} );

	clearScreen();

	document.querySelector( 'table#search-table td.result' ).appendChild( node );
}

function showDataset( dataset ) {
	var template = document.querySelector( '#dataset' ),
			node = document.importNode( template.content, true ),
			anchor = node.querySelector( '.website a' );

	node.querySelector( 'h2' ).innerText = dataset.title;
	node.querySelector( 'p.author' ).innerText = dataset.author;
	node.querySelector( 'p.description' ).innerHTML = dataset.description;
	node.querySelector( 'p.date' ).innerText = dataset.creationDate;

	anchor.innerHTML = dataset.website;
	anchor.href = dataset.website;

	document.querySelector( 'table#search-table td.result' ).appendChild( node );
}

function makeRelatedPitRow( relatedPit ) {
	var relatedRowTemplate = document.querySelector( '#relation' ),
			node = document.importNode( relatedRowTemplate.content, true ),
			anchor = node.querySelector( 'td.name a' );

	anchor.innerText = relatedPit.name;
	anchor.href = '#pit/' + makeSafe( relatedPit.id );

	return node;
}
