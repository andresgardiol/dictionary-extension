const definitionTextArea = document.getElementById('definition');

const form = document.getElementById('form');
form.addEventListener('submit', (event) => {
	event.preventDefault();
	if (wordInput.value && definitionTextArea.value) {
		loadData().then((data) => {
			const input = wordInput.value.toLowerCase();
			data[input] = definitionTextArea.value;
			saveData(data);
		});
	}
});

const wordInput = document.getElementById('word');
wordInput.addEventListener('input', (event) => {
	loadData().then((data) => {
		const inputOriginal = wordInput.value;
		const inputLower = inputOriginal.toLowerCase();
		const inputUpper = inputOriginal.toUpperCase();
		const inputCapitalized = inputOriginal.charAt(0).toUpperCase() + inputOriginal.slice(1);;

		let definition = data[inputOriginal] || data[inputLower] || data[inputUpper] || data[inputCapitalized]
		if (definition) {
			if (typeof definition === 'object') {
				definition = JSON.stringify(definition);
			}
			definitionTextArea.value = definition;
		} else {
			definitionTextArea.value = '';
		}
	});
});

const exportButton = document.getElementById('export');
exportButton.addEventListener('click', (event) => {
	loadData().then((data) => {
		const dataString = JSON.stringify(!data? {} : data)
		console.log("Exported data:",dataString);
		navigator.clipboard.writeText(dataString).catch((err) => {
			console.log('Error copying data to clipboard', err);
		});
	});
});

const importButton = document.getElementById('import');
importButton.addEventListener('click', async (event) => {
	const json = await navigator.clipboard.readText()
		.catch((err)=> {
			console.log("Error reading from clipboard", err)
		});
	if (json == null) {
		console.log("Null json, not imported")
		return
	}
	let data;
	try {
	 data = JSON.parse(json);
	} catch(err) {
		console.log("Error parsing clipboard data", err);
	}
	const oldData = await loadData();
	const newData = {...oldData, ...data};

	saveData(newData);
});

const deleteButton = document.getElementById('delete');
deleteButton.addEventListener('click', (event) => {
	deleteData()
});

const saveData = (data) => {
	return chrome.storage.local.set({data: data})
			.then(() => {
				console.log("Successfully saved")
			});
}

const loadData = () => {
	return chrome.storage.local.get(['data'])
			.then((result) => {
				return !result.data? {} : result.data;
			});
}

const deleteData = (data) => {
	chrome.storage.local.clear();
	console.log("Successfully deleted data", data);
}
