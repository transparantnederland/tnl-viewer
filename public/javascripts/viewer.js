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

		list.forEach( function( key, item ) {
			item.count = 0; //reset count
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
	
	filters.forEach( function( key, filter ) {
		var filterGroup = createFilterGroup( key, filter );
		if( filterGroup ) container.appendChild( filterGroup );
	} );
}

function createFilterGroup( key, properties ) {
	var items = properties.map( function( name, info ) {
				return {
					'input': {
						'checked': info.value || '',
						'data-filterkey': key,
						'data-filtervalue': name
					},
					'.name': name,
					'.count': info.count
				};
			} ),
			filterGroupElement = instantiateTemplate( '#filtergroup', {
				'h3': key,
				'ul': {
					template: '#filteritem',
					list: items
				}
			} );

	if( filterGroupElement.querySelector( 'ul' ).children.length < 2 ) return;
	
	return filterGroupElement;
}

function applyFilters(){
	var allowedPropertiesByKey = {};
	
	filters.forEach( function( key, list ) {
		allowedPropertiesByKey[ key ] = [];

		list.forEach( function( property, item ) {
			if( item.value ) allowedPropertiesByKey[ key ].push( property );
		} );

		if( !allowedPropertiesByKey[ key ].length ) delete allowedPropertiesByKey[ key ];
	} );

	filteredResults = searchResults.filter( function( pit ) {
		var filtered = false;

		allowedPropertiesByKey.forEach( function( key, list ){
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
		//ul.appendChild( createSearchResult( pit ) );
		ul.appendChild( instantiateTemplate( '#searchresult', {
			'h3 a': {
				textContent: pit.name,
				href: '#pit/' + makeSafe( pit.id )
			},
			'span.sourcetext a': {
				textContent: pit.dataset,
				href: pit.dataset
			},
			'span.typetext': pit.type
		} ) );
	} );

	container.appendChild( ul );
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

	var propertiesList = [];

	pit.forEach( makeTemplateInstructionForProperty );

	var relationLabelText = pit.type === 'tnl:Person' ? 'Organisatie' : 'Persoon',
			instructions = {
				'h2': pit.name,
				'a.sourcetext': {
					textContent: pit.dataset,
					href: '#dataset/' + pit.dataset
				},
				'table.properties tbody': {
					template: '#property',
					list: propertiesList
				},
				'table.related-pits thead td.type': relationLabelText,
				'table.related-pits tbody': {
					template: '#relation',
					list: relatedPits,
					convert: convertRelatedPit
				}
			};

	if( pit.type === 'tnl:Person' ) {
		instructions[ 'a.all-relations' ] = {
			textContent: 'alle relaties tonen',
			href: '#pit/' + makeSafe( pit.id ) + '/network'
		};
	}

	var pitElement = instantiateTemplate( '#pit', instructions );

	clearScreen();

	return document.querySelector( 'table#search-table td.result' ).appendChild( pitElement );

	function makeTemplateInstructionForProperty( key, value ) {
		if( pitPropertiesBlacklist.indexOf( key ) > -1 ) return;

		if( key === 'data' ) return value.forEach( makeTemplateInstructionForProperty );

		propertiesList.push( {
			'td.property-name': key,
			'td.property-value': /^http/.exec( value ) ?
				'<a href="' + value + '">' + value + '</a>' :
				value
		} );
	}
}

function showNetwork( err, pit, relatedPits ) {
	if( err ) return showError( err );

	var networkElement = instantiateTemplate( '#network', {
		'h2': pit.name,
		'table.related-pits tbody': {
			template: '#relation',
			list: relatedPits,
			convert: convertRelatedPit
		}
	} );

	clearScreen();

	document.querySelector( 'table#search-table td.result' ).appendChild( networkElement );
}

function showDataset( dataset ) {
	var datasetElement = instantiateTemplate( '#dataset', {
		'h2': dataset.title,
		'p.author': dataset.author,
		'p.description': dataset.description,
		'p.date': dataset.creationDate,
		'p.website a': {
			textContent: dataset.website,
			href: dataset.website
		}
	} );

	document.querySelector( 'table#search-table td.result' ).appendChild( datasetElement );
}

function convertRelatedPit( relatedPit ) {
	return {
		'td.name a': {
			textContent: relatedPit.name,
			href: '#pit/' + makeSafe( relatedPit.id )
		}
	};
}
