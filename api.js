var express = require( 'express' ),
		app = express(),
		mongo = require( 'mongoskin' ),
		db = mongo.db( 'mongodb://localhost:27017/tnl-flags', { native_parser:true } );

var flag_types = [
			'missing_relation',
			'invalid_relation',
			'invalid_relation_type',
			'invalid_pit_type',
			'invalid_pit'
		];

db.bind( 'flags' );

app.get( '/', function( req, res ) {
	return res.send( 200 );
} );

app.post( '/flag', function( req, res ) {
	if( !req.body.pit_ids ) return res.status( 500 ).send( 'missing pit_ids' );
	if( !req.body.flag_type ) return res.status( 500 ).send( 'missing flag_type' );
	if( flag_types.indexOf( req.body.flag_type ) === -1 ) {
		return res.status( 500 ).send( 'invalid flag_type ' + req.body.flag_type + ', must be one of: [' + flag_types.join( ', ' ) + ' ]' );
	}
	if( )

	req.body.created = new Date();
	
	db.flags.insert( req.body, function( err, result ) {
		if( err ) return res.status( 500 ).send( err.message );
		res.send( 200 );
	} );
} );

app.get( '/flags', function( req, res ) {
	db.flags.find( req.query ).toArray( function( err, flags ) {
		if( err ) return res.status( 500 ).send( err.message );
		res.json( flags );
	} );
} );

module.exports = app;

var flagging_rules = [{
	flag_type: 'missing_relation',
	pit_ids: [ 123, 234 ],
	relation_type: 'tnl:employee'
}, {
	flag_type: 'invalid_relation',
	pit_ids: [ 123, 234 ]
}, {
	flag_type: 'invalid_relation_type',
	pit_ids: [ 123, 234 ],
	relation_type: 'tnl:employee'
}, {
	flag_type: 'invalid_pit_type',
	pit_ids: [ 123 ],
	pit_type: 'tnl:Commercial'
}, {
	flag_type: 'invalid_pit',
	pit_ids: [ 123 ]
}];

var flagging_rules = [{
	pit: 123,
	flag_type: 'missing_relation',
	targetPit: 
	value: {
		pit: 345,
		type: 'tnl:same',
	}
}, {
	flag_type: 'invalid_relation',
	pit_ids: [ 123, 234 ]
}, {
	flag_type: 'invalid_relation_type',
	pit_ids: [ 123, 234 ],
	relation_type: 'tnl:employee'
}, {
	flag_type: 'invalid_pit_type',
	pit_ids: [ 123 ],
	pit_type: 'tnl:Commercial'
}, {
	flag_type: 'invalid_pit',
	pit_ids: [ 123 ]
}];


