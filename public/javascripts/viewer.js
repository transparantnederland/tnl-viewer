document.addEventListener( 'clear', clear );

routeHandlers.pit = pitHandler;
routeHandlers.dataset = datasetHandler;

function clear() {
	document.querySelector( 'td.filtertd ul' ).innerText = '';
	document.querySelector( 'td.result' ).innerText = '';
	document.querySelector( 'input#search' ).value = '';
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
