
data = [];
for ( i = 0; i < 100000; i++ ) 
	data.push ( {
	      "type": "1",
	      "price": 20,
	      "qty": 10,
	      "id": i,
	      "sumQty": 30
	    });


timeStart = new Date().getTime();
db.trades.insert( data,  function(err, inserted) {
 	
 	// console.dir ( inserted );
	console.dir ( " === END === " );
	timeEnd = new Date().getTime();
	console.dir ( "Milliseconds: " + (timeEnd - timeStart ));
});



=====================================================
=====================================================


mongoInsert = function ( id, cb ) {

  data = {
      "type": "1",
      "price": 20,
      "qty": 10,
      "id": id,
      "sumQty": 30
    }

  db.trades.insert( data,  function(err, inserted) {
    
    cb ( err, inserted );
  });
}

timeStart = new Date().getTime();

// provede 10 tisic insertu do databaze
async.times(100000, function(n, next){
    
    mongoInsert ( n, next )

}, function(err, done) {

	// console.dir ( done );
	console.dir ( " === END === " );
	timeEnd = new Date().getTime();
	console.dir ( "Milliseconds: " + (timeEnd - timeStart ));
});

