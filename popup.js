const dictionary = {};
const definitionTextArea = document.getElementById('definition');

const form = document.getElementById('form');
form.addEventListener('submit', (event) => {
	event.preventDefault();
	if (wordInput.value && definitionTextArea.value) {
		const input = wordInput.value.toLowerCase();
		dictionary[input] = definitionTextArea.value;
		saveData(dictionary);
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
		console.log(JSON.stringify(data));
		const json = JSON.stringify(data);
		navigator.clipboard.writeText(json).catch(() => {
			alert('Error copying data to clipboard');
		});
	});
});

const importButton = document.getElementById('import');
importButton.addEventListener('click', async (event) => {
	const json = prompt('Paste JSON here');
	const data = JSON.parse(json);

	const oldData = await loadData();
	const newData = {...oldData, ...data};

	saveData(newData);
});

const deleteButton = document.getElementById('delete');
deleteButton.addEventListener('click', (event) => {
	// Prompt user to confirm deletion
	if (confirm('Are you sure you want to delete all data?')) {
		chrome.storage.local.clear();
	}
});

const saveData = (data) => {
	return chrome.storage.local.set({data: data})
			.then(() => {
			});
}

const loadData = () => {
	return chrome.storage.local.get(['data'])
			.then((result) => {
				return result.data;
			});
}

