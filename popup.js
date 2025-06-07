const definitionTextArea = document.getElementById('definition');
const notification = document.getElementById('notification');
const searchInput = document.getElementById('search');
const searchResults = document.getElementById('search-results');

// Función para mostrar notificaciones
const showNotification = (message, type = 'info') => {
	notification.textContent = message;
	notification.className = `notification ${type}`;
	
	// Ocultar la notificación después de 3 segundos
	setTimeout(() => {
		notification.className = 'notification hidden';
	}, 3000);
};

const form = document.getElementById('form');
form.addEventListener('submit', (event) => {
	event.preventDefault();
	if (wordInput.value && definitionTextArea.value) {
		loadData().then((data) => {
			const input = wordInput.value.toLowerCase();
			data[input] = definitionTextArea.value;
			saveData(data).then(() => {
				showNotification(`"${wordInput.value}" se ha guardado exitosamente`, 'success');
				wordInput.value = '';
				definitionTextArea.value = '';
				wordInput.focus();
			});
		});
	} else {
		showNotification('Por favor ingresa tanto la palabra como la definición', 'error');
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

// Implementación de la búsqueda
searchInput.addEventListener('input', (event) => {
	const searchTerm = searchInput.value.toLowerCase().trim();
	
	if (searchTerm.length < 2) {
		searchResults.classList.add('hidden');
		return;
	}
	
	loadData().then((data) => {
		const matchingWords = Object.keys(data).filter(word => 
			word.toLowerCase().includes(searchTerm)
		);
		
		if (matchingWords.length > 0) {
			searchResults.innerHTML = '';
			searchResults.classList.remove('hidden');
			
			matchingWords.forEach(word => {
				const resultElement = document.createElement('div');
				resultElement.textContent = word;
				resultElement.addEventListener('click', () => {
					wordInput.value = word;
					definitionTextArea.value = data[word];
					searchResults.classList.add('hidden');
					searchInput.value = '';
				});
				searchResults.appendChild(resultElement);
			});
		} else {
			searchResults.classList.add('hidden');
		}
	});
});

// Cerrar los resultados de búsqueda al hacer clic fuera
document.addEventListener('click', (event) => {
	if (!searchResults.contains(event.target) && event.target !== searchInput) {
		searchResults.classList.add('hidden');
	}
});

// Exportar a JSON
document.getElementById('export-json').addEventListener('click', (event) => {
	event.preventDefault();
	loadData().then((data) => {
		const dataString = JSON.stringify(data || {});
		navigator.clipboard.writeText(dataString).then(() => {
			showNotification('Datos exportados en formato JSON al portapapeles', 'success');
		}).catch((err) => {
			console.log('Error copying data to clipboard', err);
			showNotification('Error al exportar datos', 'error');
		});
	});
});

// Exportar a CSV
document.getElementById('export-csv').addEventListener('click', (event) => {
	event.preventDefault();
	loadData().then((data) => {
		if (Object.keys(data).length === 0) {
			showNotification('No hay datos para exportar', 'info');
			return;
		}
		
		let csvContent = 'Palabra,Definición\n';
		
		for (const [word, definition] of Object.entries(data)) {
			// Escapar comillas y procesar para formato CSV
			const escapedWord = `"${word.replace(/"/g, '""')}"`;
			const escapedDefinition = `"${definition.toString().replace(/"/g, '""')}"`;
			csvContent += `${escapedWord},${escapedDefinition}\n`;
		}
		
		navigator.clipboard.writeText(csvContent).then(() => {
			showNotification('Datos exportados en formato CSV al portapapeles', 'success');
		}).catch((err) => {
			console.log('Error copying CSV data to clipboard', err);
			showNotification('Error al exportar datos en CSV', 'error');
		});
	});
});

// Exportar a TXT
document.getElementById('export-txt').addEventListener('click', (event) => {
	event.preventDefault();
	loadData().then((data) => {
		if (Object.keys(data).length === 0) {
			showNotification('No hay datos para exportar', 'info');
			return;
		}
		
		let txtContent = '';
		
		for (const [word, definition] of Object.entries(data)) {
			txtContent += `${word}\n${definition}\n\n`;
		}
		
		navigator.clipboard.writeText(txtContent).then(() => {
			showNotification('Datos exportados en formato TXT al portapapeles', 'success');
		}).catch((err) => {
			console.log('Error copying TXT data to clipboard', err);
			showNotification('Error al exportar datos en TXT', 'error');
		});
	});
});

// Importar desde JSON
document.getElementById('import-json').addEventListener('click', async (event) => {
	event.preventDefault();
	try {
		const json = await navigator.clipboard.readText();
		if (!json) {
			showNotification('No hay datos en el portapapeles', 'error');
			return;
		}
		
		const data = JSON.parse(json);
		if (typeof data !== 'object' || data === null) {
			showNotification('Formato JSON inválido', 'error');
			return;
		}
		
		const oldData = await loadData();
		const newData = {...oldData, ...data};
		
		await saveData(newData);
		showNotification(`Se importaron ${Object.keys(data).length} palabras correctamente`, 'success');
	} catch (err) {
		console.log('Error parsing JSON data', err);
		showNotification('Error al importar datos JSON', 'error');
	}
});

// Importar desde CSV
document.getElementById('import-csv').addEventListener('click', async (event) => {
	event.preventDefault();
	try {
		const csvText = await navigator.clipboard.readText();
		if (!csvText) {
			showNotification('No hay datos en el portapapeles', 'error');
			return;
		}
		
		const lines = csvText.split('\n');
		const data = {};
		let count = 0;
		
		// Empezar desde la segunda línea para omitir encabezados
		for (let i = 1; i < lines.length; i++) {
			if (!lines[i].trim()) continue;
			
			// Lógica para manejar correctamente comas dentro de campos con comillas
			let parts = [];
			let currentPart = '';
			let inQuotes = false;
			
			for (let char of lines[i]) {
				if (char === '"') {
					inQuotes = !inQuotes;
				} else if (char === ',' && !inQuotes) {
					parts.push(currentPart);
					currentPart = '';
				} else {
					currentPart += char;
				}
			}
			
			if (currentPart) {
				parts.push(currentPart);
			}
			
			if (parts.length >= 2) {
				const word = parts[0].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
				const definition = parts[1].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
				
				if (word && definition) {
					data[word] = definition;
					count++;
				}
			}
		}
		
		if (count === 0) {
			showNotification('No se encontraron datos válidos en CSV', 'error');
			return;
		}
		
		const oldData = await loadData();
		const newData = {...oldData, ...data};
		
		await saveData(newData);
		showNotification(`Se importaron ${count} palabras desde CSV`, 'success');
	} catch (err) {
		console.log('Error parsing CSV data', err);
		showNotification('Error al importar datos CSV', 'error');
	}
});

// Importar desde TXT
document.getElementById('import-txt').addEventListener('click', async (event) => {
	event.preventDefault();
	try {
		const txtText = await navigator.clipboard.readText();
		if (!txtText) {
			showNotification('No hay datos en el portapapeles', 'error');
			return;
		}
		
		// Formato esperado: Palabra\nDefinición\n\n
		const entries = txtText.split('\n\n');
		const data = {};
		let count = 0;
		
		for (const entry of entries) {
			if (!entry.trim()) continue;
			
			const lines = entry.split('\n');
			if (lines.length >= 2) {
				const word = lines[0].trim();
				const definition = lines.slice(1).join('\n').trim();
				
				if (word && definition) {
					data[word] = definition;
					count++;
				}
			}
		}
		
		if (count === 0) {
			showNotification('No se encontraron datos válidos en TXT', 'error');
			return;
		}
		
		const oldData = await loadData();
		const newData = {...oldData, ...data};
		
		await saveData(newData);
		showNotification(`Se importaron ${count} palabras desde TXT`, 'success');
	} catch (err) {
		console.log('Error parsing TXT data', err);
		showNotification('Error al importar datos TXT', 'error');
	}
});

// Botón de exportación tradicional (solo JSON)
const exportButton = document.getElementById('export');
exportButton.addEventListener('click', (event) => {
	// Redirigir al export-json para mantener compatibilidad
	document.getElementById('export-json').click();
});

// Botón de importación tradicional (solo JSON)
const importButton = document.getElementById('import');
importButton.addEventListener('click', async (event) => {
	// Redirigir al import-json para mantener compatibilidad
	document.getElementById('import-json').click();
});

const deleteButton = document.getElementById('delete');
deleteButton.addEventListener('click', (event) => {
	if (confirm('¿Estás seguro de que deseas eliminar todos los datos?')) {
		deleteData();
		showNotification('Todos los datos han sido eliminados', 'info');
	}
});

const saveData = (data) => {
	return chrome.storage.local.set({data: data})
			.then(() => {
				console.log("Successfully saved");
				return data;
			});
}

const loadData = () => {
	return chrome.storage.local.get(['data'])
			.then((result) => {
				return !result.data ? {} : result.data;
			});
}

const deleteData = () => {
	chrome.storage.local.clear();
	console.log("Successfully deleted data");
}
