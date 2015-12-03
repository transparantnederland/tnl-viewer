function ajaxRequest(url, method, query, callback){
	if(typeof method === 'object'){
		callback = query;
		query = method;
		method = 'GET';
	} else if(typeof method === 'function'){
		callback = method;
		query = {};
		method = 'GET';
	}

	var queryKeys = Object.keys(query);
	queryKeys.forEach(function(key, i){
		url += (i ? '&' : '?') + key + '=' + query[key];
	});

	var httpRequest = new XMLHttpRequest()
	httpRequest.onreadystatechange = function(e){
		var response;
		if(e.target.readyState === 4) {
			response = e.target.response;

			if( response[ 0 ] === '{' || response[ 0 ] === '[' ) {
				try{
					response = JSON.parse( response );
				} catch( e ) {
					console.log('could not parse as JSON: ' + response);
				}
			}

			callback(response);
		}
	};
	httpRequest.open(method, url);
	httpRequest.send();
}
