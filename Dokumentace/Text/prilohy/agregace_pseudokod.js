last = cache[cache.length - 1]; // poslední prvek v cache
if (isInterval(last.time, newItem.time)) {

	// nový záznam spadá do stejného intervalu
	// jako poslední prvek v poli, a proto se zagreguje
	last.high 	= Max(newItem.price, last.high);
	last.low 	= Min(newItem.price, last.low);
	last.close 	= last.price;
	last.volume += newItem.volume;
} else {

	// nový záznam je z nového intervalu
	// a vloží se tak do pole jako nový prvek 
	cache.push({
		volume: newItem.volume,
		open: 	newItem.price,
		high: 	newItem.price,
		low: 	newItem.price,
		close: 	newItem.price,
		time: 	newItem.time
	});
}

