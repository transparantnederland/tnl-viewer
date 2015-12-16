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

function toggleFilter( e ) {
	var key = this.dataset.filterkey,
			value = this.dataset.filtervalue,
			state = !!this.checked,
			filterTargetName = this.dataset.filtertarget,
			items = filterableItems[ filterTargetName ],
			callbacks = {
				'search-results': showSearchResults
			};

	filters[ filterTargetName ][ key ][ value ].value = state;
	
	filteredItems[ filterTargetName ] = applyFilters( items, filterTargetName );
	updateFilters( items, filterTargetName );
	showFilters( filterTargetName );
	
	callbacks[ filterTargetName ]();
}

var filterableProperties = [
			'type',
			'dataset'
		],
		filters = {},
		searchResults,
		filterableItems = {},
		filteredItems = {};

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
			filtered = filteredItems[ filterTargetName ] = applyFilters( filtered, filterTargetName );
			showFilters( filterTargetName );
			showSearchResults();
		}
	);
}

function updateFilters( items, filterTargetName ) {
	return filterableProperties.forEach( updateFilterableProperty );

	function updateFilterableProperty( key ) {
		filters[ filterTargetName ] = filters[ filterTargetName ] || {};

		var list = filters[ filterTargetName ][ key ] = filters[ filterTargetName ][ key ] || {};

		list.forEach( resetItemCount );

		items.forEach( getFilterablePropertiesFromConcept );

		function resetItemCount( key, item ) {
			item.count = 0; //reset count
		}

		function getFilterablePropertiesFromConcept( concept ) {
			return concept.forEach( getFilterablePropertiesFromPit );
		}

		function getFilterablePropertiesFromPit( pitContainer ) {
			var value = pitContainer.pit[ key ],
					item = list[ value ],
					storedValue;

			if( item ) {
				storedValue = item.value;
			} else item = list[ value ] = { count: 0 };

			item.value = storedValue || false;
			item.count++;
		}
	}
}

function showFilters( filterTargetName ) {
	var container = document.querySelector( 'ul#filtercontainer' );
	container.innerHTML = '<h3>filter de resultaten:</h3>';
	
	return filters[ filterTargetName ].forEach( createAndAppendFilterGroup );

	function createAndAppendFilterGroup( key, filter ) {
		var filterGroup = createFilterGroup( key, filter );
		if( filterGroup ) container.appendChild( filterGroup );
	}

	function createFilterGroup( key, properties ) {
		var items = properties.map( createFilterItem ),
				filterGroupElement = instantiateTemplate( '#filtergroup', {
					'h3': key,
					'ul': {
						template: '#filteritem',
						list: items
					}
				} );

		if( filterGroupElement.querySelector( 'ul' ).children.length < 2 ) return;
		
		return filterGroupElement;

		function createFilterItem( name, info ) {
			var id = key + '-' + name;
			return {
				'input': {
					'checked': info.value || '',
					'data-filterkey': key,
					'data-filtervalue': name,
					'data-filtertarget': filterTargetName,
					'id': id
				},
				'label': {
					htmlFor: id
				},
				'.name': name,
				'.count': info.count
			};
		}
	}
}

function applyFilters( items, filterTargetName ){
	var allowedPropertiesByKey = {};
	
	filters[ filterTargetName ].forEach( getAllowedProperties );

	return items.filter( conceptFilterPredicate );

	function getAllowedProperties( key, list ) {
		allowedPropertiesByKey[ key ] = [];

		list.forEach( getAllowedProperty );

		if( !allowedPropertiesByKey[ key ].length ) delete allowedPropertiesByKey[ key ];
		return;

		function getAllowedProperty( property, item ) {
			if( item.value ) allowedPropertiesByKey[ key ].push( property );
		}
	}

	function conceptFilterPredicate( concept ) {
		var matchedFilter = concept.map( pitFilterPredicate );

		return matchedFilter.indexOf( true ) > -1; // if any of the concept's pits match the filter, show the whole concept

		function pitFilterPredicate( pitContainer ) {
			var filtered = false;

			allowedPropertiesByKey.forEach( updateFiltered );

			return !filtered;

			function updateFiltered( key, allowedProperties ){
				filtered = filtered || allowedProperties.indexOf( pitContainer.pit[ key ] ) === -1;
			}
		}
	}
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

function pitHandler( routeParts ) {
	// get back the original pit uri
	var pitId = routeParts[ 0 ] = makeUri( routeParts[ 0 ] );

	if( routeParts.length === 1 ){
		getPit( pitId, function( err, concept ) {
			getRelations( concept[0].pit, function( err, relatedConcepts ) {
				showConcept( err, concept, relatedConcepts );
			} );
		} );
	} else if( routeParts[ 1 ] === 'network' ) {
		getPit( pitId, function( err, concept ) {
			ajaxRequest(
				apiUrl + 'peopleFromOrgsFromPerson',
				{ id: pitId },
				function( network ) {
					showNetwork( null, concept, network );
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
			'type',
			'sex',
			'rank',
			'titles',
			'etitles',
			'initials',
			'tussenv',
			'firstnames'
		];

function showConcept( err, concept, relatedConcepts ) {
	if( err ) return showError( err );
	document.querySelector( 'input#search' ).value = '';

	var pit0 = concept[ 0 ].pit,
			names = [],
			sources = [],
			propertiesProcessed = [];
			propertiesList = [];

	concept.forEach( extractShowableData );

	var relationLabelText = pit0.type === 'tnl:Person' ? 'Organisatie' : 'Persoon',
			instructions = {
				'h2': names.join(', '),
				'span.sources': sources.map( makeDatasetLink ).join(', '),
				'table.properties tbody': {
					template: '#property',
					list: propertiesList
				},
				'table.related-pits thead td.type': relationLabelText,
				'table.related-pits tbody': {
					template: '#relation',
					list: relatedConcepts,
					convert: convertRelatedConcept
				}
			};

	if( pit0.type === 'tnl:Person' ) {
		instructions[ 'a.all-relations' ] = {
			textContent: 'alle relaties tonen',
			href: '#pit/' + makeSafe( pit0.id ) + '/network'
		};
	}

	var pitElement = instantiateTemplate( '#pit', instructions );

	clearScreen();

	return document.querySelector( 'table#search-table td.result' ).appendChild( pitElement );

	function extractShowableData( pitContainer ) {
		var pit = pitContainer.pit;

		if( names.indexOf( pit.name ) === -1 ) names.push( pit.name );
		if( sources.indexOf( pit.dataset ) === -1 ) sources.push( pit.dataset );
		pit.forEach( makeTemplateInstructionForProperty );
	}

	function makeTemplateInstructionForProperty( key, value ) {
		if( pitPropertiesBlacklist.indexOf( key ) > -1 ) return;

		if( key === 'data' ) return value.forEach( makeTemplateInstructionForProperty );

		var signature = key + '-' + value;

		if( propertiesProcessed.indexOf( signature ) > - 1 ) return;

		propertiesProcessed.push( signature );

		propertiesList.push( {
			'td.property-name': key,
			'td.property-value': /^http/.exec( value ) ?
				'<a href="' + value + '">' + value + '</a>' :
				value
		} );
	}

	function makeDatasetLink( datasetName ) {
		return '<a href="#dataset/' + datasetName + '">' + datasetName + '</a>';
	}
}

function showNetwork( err, concept, relatedConcepts ) {
	if( err ) return showError( err );

	var networkElement = instantiateTemplate( '#network', {
		'h2': concept[ 0 ].pit.name,
		'table.related-pits tbody': {
			template: '#relation',
			list: relatedConcepts,
			convert: convertRelatedConcept
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

function convertRelatedConcept( relatedConcept ) {
	var relatedPit = relatedConcept[ 0 ].pit;
	return {
		'td.name a': {
			textContent: relatedPit.name,
			href: '#pit/' + makeSafe( relatedPit.id )
		}
	};
}
