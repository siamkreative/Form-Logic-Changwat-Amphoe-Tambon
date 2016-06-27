//This will sort your array
function SortByName(a, b) {
	var aName = a.name.toLowerCase();
	var bName = b.name.toLowerCase();
	return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
}

jQuery(document).ready(function ($) {

	var changwatsData, amphoesData, tambonsData;
	var urls = ['data/changwats/json/en.json', 'data/amphoes/json/en.json', 'data/tambons/json/en.json']
	var changwatSelect = $('#changwat');
	var amphoeSelect = $('#amphoe');
	var tambonSelect = $('#tambon');
	var defaultOption = '<option value="">Please select</option>';

	/**
	 * Multiple getJSON requests at once
	 * http://stackoverflow.com/a/19026443/1414881
	 * http://stackoverflow.com/a/20148292/1414881
	 */
	$.when(
		$.getJSON(urls[0]),
		$.getJSON(urls[1]),
		$.getJSON(urls[2])
	).done(function (changwats, amphoes, tambons) {
		// Get the JSON data and order it alphabetically
		changwatsData = changwats[0].en.changwats.sort(SortByName);
		amphoesData = amphoes[0].en.amphoes.sort(SortByName);
		tambonsData = tambons[0].en.tambons.sort(SortByName);

		// Append the Changwats list (only once)
		var options = '';
		$.each(changwatsData, function (index, val) {
			options += '<option data-pid="' + val.pid + '">' + val.name + '</option>';
		});
		changwatSelect.append(options);

		// Update the Amphoes list based on Changwats list
		changwatSelect.on('change', function (event) {
			event.preventDefault();

			var needle = $(':selected', $(this)).attr('data-pid');
			var options = '';

			// iterate over each element in the array
			$.each(amphoesData, function (i, val) {
				// look for the entry with a matching `changwat_pid` value
				if (amphoesData[i].changwat_pid == needle) {
					options += '<option data-pid="' + amphoesData[i].pid + '">' + amphoesData[i].name + '</option>';
				}
			});

			// Apppend the result to select
			amphoeSelect.html(defaultOption).append(options);

			// Reset the tambons
			tambonSelect.html(defaultOption);
		});

		amphoeSelect.on('change', function (event) {
			event.preventDefault();

			var needle = $(':selected', $(this)).attr('data-pid');
			var options = '';

			// iterate over each element in the array
			$.each(tambonsData, function (i, val) {
				// look for the entry with a matching `amphoe_pid` value
				if (tambonsData[i].amphoe_pid == needle) {
					options += '<option data-pid="' + tambonsData[i].pid + '">' + tambonsData[i].name + '</option>';
				}
			});

			// Apppend the result to select
			tambonSelect.html(defaultOption).append(options);

		});
	});

	$('form').submit(function (event) {
		event.preventDefault();

		var dataArray = $(this).serializeArray(),
			dataObj = {};

		$(dataArray).each(function (i, field) {
			dataObj[field.name] = field.value;
		});

		$('#result').show();
		$('#result > code').html(JSON.stringify(dataObj)).each(function (i, block) {
			hljs.highlightBlock(block);
		});
	});

});