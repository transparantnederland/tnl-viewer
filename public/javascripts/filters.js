var filterableProperties = {},
		filters = {},
		filterableItems = {},
		filteredItems = {},
		filterCallbacks = {};

eventHandlers[ 'input[type=checkbox].filter' ] = { change: toggleFilter };

function toggleFilter( e ) {
	var property = this.dataset.filterkey,
			filterValue = this.dataset.filtervalue,
			state = !!this.checked,
			filterTargetName = this.dataset.filtertarget,
			items = filterableItems[ filterTargetName ];

	filters[ filterTargetName ][ property ][ filterValue ].value = state;
	
	applyFilters( filterTargetName );
	updateFilters( items, filterTargetName );
	showFilters( filterTargetName );
	
	filterCallbacks[ filterTargetName ]();
}

function updateFilters( items, filterTargetName ) {
	return filterableProperties[ filterTargetName ].forEach( updateFilterableProperty );

	function updateFilterableProperty( name, key ) {
		filters[ filterTargetName ] = filters[ filterTargetName ] || {};

		var list = filters[ filterTargetName ][ name ] = filters[ filterTargetName ][ name ] || {};

		list.forEach( resetItemCount );

		items.forEach( getFilterablePropertiesFromConcept );

		function resetItemCount( key, item ) {
			item.count = 0; //reset count
		}

		function getFilterablePropertiesFromConcept( concept ) {
			return concept.forEach( getFilterablePropertiesFromPit );
		}

		function getFilterablePropertiesFromPit( pitContainer ) {
			var value = resolveOnObject( pitContainer, key ),
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

function applyFilters( filterTargetName ){
	var allowedPropertiesByKey = {},
			filterablePropertiesForTarget = filterableProperties[ filterTargetName ];
	
	filters[ filterTargetName ].forEach( getAllowedProperties );

	filteredItems[ filterTargetName ] = filterableItems[ filterTargetName ].filter( conceptFilterPredicate );

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

			function updateFiltered( filterName, allowedProperties ){
				var propertyPath = filterablePropertiesForTarget[ filterName ],
						value = resolveOnObject( pitContainer, propertyPath );

				filtered = filtered || allowedProperties.indexOf( value ) === -1;
			}
		}
	}
}
