
function showErrors ( el, err ) {

	$.each( err, function ( ind, val ) {

		var item = $(el).find("*[name="+ind+"]");

		item.css("border", "1px solid red" );

		e = val[0];
		if ( $.type( val ) === "string")
			e = val;

		msg = "<div class='errorMsg error'>"+e+"</div>";
		item.after ( msg );
	});
}

function hideErrors ( el ) {

	$(el).find(".errorMsg").fadeOut().remove();
}