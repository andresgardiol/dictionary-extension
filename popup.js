const definitionTextArea = document.getElementById('definition');
const notification = document.getElementById('notification');
const wordInput = document.getElementById('word');
const searchResults = document.getElementById('search-results');
const wordsList = document.getElementById('words-list');
const wordlistFilter = document.getElementById('wordlist-filter');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');

// Historial de búsquedas - máximo 10 elementos
const MAX_HISTORY_ITEMS = 10;

// Variables para el sistema de sugerencias de etiquetas
let suggestionsActive = false;
let currentTagStart = -1;
let currentTagEnd = -1;
let tagSuggestions = [];
let selectedSuggestionIndex = -1;
let isWritingTag = false;

// Función para cargar y mostrar la lista de palabras
const loadWordsList = async (filter = '', tagFilter = null) => {
	const data = await loadData();
	const words = Object.keys(data);
	
	// Limpiar lista existente
	wordsList.innerHTML = '';
	
	if (words.length === 0) {
		const emptyMessage = document.createElement('div');
		emptyMessage.className = 'empty-message';
		emptyMessage.textContent = 'No saved words';
		wordsList.appendChild(emptyMessage);
		return;
	}
	
	// Filtrar y ordenar palabras
	let filteredWords = words;
	
	// Filtrar por texto si existe
	if (filter) {
		filteredWords = filteredWords.filter(word => 
			word.toLowerCase().includes(filter.toLowerCase())
		);
	}
	
	// Filtrar por etiqueta si existe
	if (tagFilter) {
		filteredWords = filteredWords.filter(word => {
			const wordData = loadWord(word, data);
			return wordData && wordData.tags && wordData.tags.includes(tagFilter);
		});
	}
	
	// Ordenar alfabéticamente
	filteredWords.sort((a, b) => a.localeCompare(b));
	
	if (filteredWords.length === 0) {
		const emptyMessage = document.createElement('div');
		emptyMessage.className = 'empty-message';
		emptyMessage.textContent = tagFilter ? 
			`No words with tag #${tagFilter}` : 
			'No words match your search';
		wordsList.appendChild(emptyMessage);
		return;
	}
	
	filteredWords.forEach(word => {
		const wordItem = document.createElement('div');
		wordItem.className = 'word-item';
		
		const wordContainer = document.createElement('div');
		wordContainer.className = 'word-container';
		
		const wordText = document.createElement('span');
		wordText.className = 'word-text';
		wordText.textContent = word;
		wordContainer.appendChild(wordText);
		
		// Añadir etiquetas si existen
		const wordData = loadWord(word, data);
		if (wordData && wordData.tags && wordData.tags.length > 0) {
			const tagsContainer = document.createElement('div');
			tagsContainer.className = 'tags-container';
			
			wordData.tags.forEach(tag => {
				const tagElement = document.createElement('span');
				tagElement.className = 'tag-pill';
				tagElement.textContent = '#' + tag;
				tagElement.addEventListener('click', (e) => {
					e.stopPropagation();
					// Filtrar por esta etiqueta
					loadWordsList('', tag);
					// Actualizar la interfaz para mostrar que estamos filtrando
					showTagFilterStatus(tag);
				});
				tagsContainer.appendChild(tagElement);
			});
			
			wordContainer.appendChild(tagsContainer);
		}
		
		wordItem.appendChild(wordContainer);
		
		const wordActions = document.createElement('div');
		wordActions.className = 'word-actions';
		
		const editBtn = document.createElement('button');
		editBtn.className = 'small secondary';
		editBtn.textContent = 'Edit';
		editBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			wordInput.value = word;
			// Cargar la definición con formato apropiado
			const wordData = loadWord(word, data);
			definitionTextArea.value = wordData ? wordData.definition : '';
			switchTab('main');
			wordInput.focus();
		});
		
		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'small warning';
		deleteBtn.textContent = 'Delete';
		deleteBtn.addEventListener('click', async (e) => {
			e.stopPropagation();
			if (confirm(`Are you sure you want to delete "${word}"?`)) {
				const currentData = await loadData();
				delete currentData[word];
				await saveData(currentData);
				showNotification(`"${word}" has been deleted`, 'info');
				loadWordsList(wordlistFilter.value, tagFilter);
				// Actualizar la lista de etiquetas
				await loadTagsFilter();
			}
		});
		
		wordActions.appendChild(editBtn);
		wordActions.appendChild(deleteBtn);
		wordItem.appendChild(wordActions);
		
		// Añadir evento para cargar la palabra
		wordItem.addEventListener('click', () => {
			wordInput.value = word;
			// Cargar la definición con formato apropiado
			const wordData = loadWord(word, data);
			if (wordData) {
				definitionTextArea.value = wordData.definition;
				// Mostrar etiquetas existentes
				showExistingTags(wordData.tags);
				// Activar panel de etiquetas si hay # en la definición
				if (wordData.definition.includes('#')) {
					isWritingTag = true;
					showAvailableTagsPanel().then(() => {
						// Filtrar las etiquetas para ocultar las que ya están en uso
						filterAvailableTags('');
					});
				}
			}
			switchTab('main');
			addToHistory(word);
		});
		
		wordsList.appendChild(wordItem);
	});
};

// Función para mostrar el estado de filtro de etiquetas
function showTagFilterStatus(tag) {
	const tagsFilterStatus = document.getElementById('tags-filter-status');
	if (tag) {
		tagsFilterStatus.innerHTML = `
			Filtering by: <span class="active-tag">#${tag}</span>
			<button id="clear-tag-filter" class="clear-filter">×</button>
		`;
		tagsFilterStatus.classList.remove('hidden');
		
		// Agregar evento para limpiar el filtro
		document.getElementById('clear-tag-filter').addEventListener('click', () => {
			loadWordsList(wordlistFilter.value);
			tagsFilterStatus.classList.add('hidden');
		});
	} else {
		tagsFilterStatus.classList.add('hidden');
	}
}

// Función para cargar las etiquetas en el filtro
async function loadTagsFilter() {
	const tagsContainer = document.getElementById('tags-filter');
	if (!tagsContainer) return;
	
	const allTags = await loadAllTags();
	tagsContainer.innerHTML = '';
	
	if (allTags.length === 0) {
		tagsContainer.innerHTML = '<div class="empty-tags">No tags available</div>';
		return;
	}
	
	allTags.forEach(tag => {
		const tagElement = document.createElement('span');
		tagElement.className = 'filter-tag';
		tagElement.textContent = '#' + tag;
		tagElement.addEventListener('click', () => {
			loadWordsList(wordlistFilter.value, tag);
			showTagFilterStatus(tag);
		});
		tagsContainer.appendChild(tagElement);
	});
}

// Función para manejar el sistema de pestañas
const switchTab = (tabId) => {
	// Desactivar todas las pestañas
	document.querySelectorAll('.tab-button').forEach(tab => {
		tab.classList.remove('active');
	});
	
	document.querySelectorAll('.tab-content').forEach(content => {
		content.classList.remove('active');
	});
	
	// Activar la pestaña seleccionada
	document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
	document.getElementById(`${tabId}-tab`).classList.add('active');
	
	// Si es la pestaña de palabras, cargar la lista y las etiquetas
	if (tabId === 'wordlist') {
		loadWordsList();
		loadTagsFilter();
	} else if (tabId === 'history') {
		loadHistoryList();
	}
};

// Configurar los eventos de las pestañas
document.querySelectorAll('.tab-button').forEach(tab => {
	tab.addEventListener('click', () => {
		switchTab(tab.getAttribute('data-tab'));
	});
});

// Filtrar la lista de palabras
wordlistFilter.addEventListener('input', () => {
	// Obtener el filtro de etiquetas activo (si hay)
	const tagsFilterStatus = document.getElementById('tags-filter-status');
	const activeTag = tagsFilterStatus && !tagsFilterStatus.classList.contains('hidden') ?
		tagsFilterStatus.querySelector('.active-tag').textContent.substring(1) : null;
		
	loadWordsList(wordlistFilter.value, activeTag);
});

// Función para mostrar notificaciones
const showNotification = (message, type = 'info') => {
	notification.textContent = message;
	notification.className = `notification ${type}`;
	
	// Ocultar la notificación después de 3 segundos
	setTimeout(() => {
		notification.className = 'notification hidden';
	}, 3000);
};

// Funciones para el historial de búsquedas
const addToHistory = async (word) => {
	if (!word) return;
	
	// Cargar historial actual
	let history = await loadHistory();
	
	// Eliminar si ya existe (para ponerlo al principio)
	history = history.filter(item => item !== word);
	
	// Añadir al principio
	history.unshift(word);
	
	// Limitar a MAX_HISTORY_ITEMS
	if (history.length > MAX_HISTORY_ITEMS) {
		history = history.slice(0, MAX_HISTORY_ITEMS);
	}
	
	// Guardar historial
	await saveHistory(history);
	
	// Actualizar la lista si es visible
	if (document.getElementById('history-tab').classList.contains('active')) {
		loadHistoryList();
	}
};

const loadHistory = async () => {
	return chrome.storage.local.get(['history'])
		.then((result) => {
			return Array.isArray(result.history) ? result.history : [];
		});
};

const saveHistory = async (history) => {
	return chrome.storage.local.set({ history });
};

const loadHistoryList = async () => {
	const history = await loadHistory();
	const data = await loadData();
	
	historyList.innerHTML = '';
	
	if (history.length === 0) {
		const emptyMessage = document.createElement('div');
		emptyMessage.className = 'empty-message';
		emptyMessage.textContent = 'No recent searches';
		historyList.appendChild(emptyMessage);
		return;
	}
	
	history.forEach(word => {
		const historyItem = document.createElement('div');
		historyItem.className = 'history-item';
		historyItem.textContent = word;
		
		historyItem.addEventListener('click', () => {
			wordInput.value = word;
			definitionTextArea.value = data[word] || '';
			switchTab('main');
		});
		
		historyList.appendChild(historyItem);
	});
};

// Limpiar historial
clearHistoryBtn.addEventListener('click', async () => {
	if (confirm('Are you sure you want to clear all history?')) {
		await saveHistory([]);
		loadHistoryList();
		showNotification('History cleared', 'info');
	}
});

const form = document.getElementById('form');
form.addEventListener('submit', (event) => {
	event.preventDefault();
	if (wordInput.value && definitionTextArea.value) {
		loadData().then((data) => {
			const input = wordInput.value.toLowerCase();
			// Usar la nueva función saveWord para guardar con formato de etiquetas
			const updatedData = saveWord(input, definitionTextArea.value, data);
			saveData(updatedData).then(() => {
				showNotification(`"${wordInput.value}" has been saved successfully`, 'success');
				addToHistory(input);
				wordInput.value = '';
				definitionTextArea.value = '';
				wordInput.focus();
				
				// Actualizar lista de etiquetas si está visible
				if (document.getElementById('wordlist-tab').classList.contains('active')) {
					loadTagsFilter();
				}
			});
		});
	} else {
		showNotification('Please enter both word and definition', 'error');
	}
});

// Implementación de la búsqueda y autocompletado unificados en el campo de palabra
wordInput.addEventListener('input', (event) => {
	const searchTerm = wordInput.value.toLowerCase().trim();
	
	// Buscar definición existente para autocompletar
	loadData().then((data) => {
		const inputOriginal = wordInput.value;
		const inputLower = inputOriginal.toLowerCase();
		const inputUpper = inputOriginal.toUpperCase();
		const inputCapitalized = inputOriginal.charAt(0).toUpperCase() + inputOriginal.slice(1);

		// Buscar coincidencias
		let match = null;
		if (data[inputOriginal]) match = inputOriginal;
		else if (data[inputLower]) match = inputLower;
		else if (data[inputUpper]) match = inputUpper;
		else if (data[inputCapitalized]) match = inputCapitalized;
		
		if (match) {
			// Cargar datos con formato apropiado
			const wordData = loadWord(match, data);
			if (wordData) {
				definitionTextArea.value = wordData.definition;
				// Mostrar etiquetas existentes
				showExistingTags(wordData.tags);
				// Activar el panel de etiquetas disponibles si hay alguna
				if (wordData.definition.includes('#')) {
					isWritingTag = true;
					showAvailableTagsPanel().then(() => {
						// Filtrar las etiquetas para ocultar las que ya están en uso
						filterAvailableTags('');
					});
				}
			}
		} else {
			definitionTextArea.value = '';
			// Limpiar etiquetas existentes
			showExistingTags([]);
		}
		
		// Mostrar resultados de búsqueda si hay al menos 2 caracteres
		if (searchTerm.length < 2) {
			searchResults.classList.add('hidden');
			return;
		}
		
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
					// Cargar datos con formato apropiado
					const wordData = loadWord(word, data);
					if (wordData) {
						definitionTextArea.value = wordData.definition;
						// Mostrar etiquetas existentes
						showExistingTags(wordData.tags);
						// Activar el panel de etiquetas disponibles si hay alguna
						if (wordData.definition.includes('#')) {
							isWritingTag = true;
							showAvailableTagsPanel().then(() => {
								// Filtrar las etiquetas para ocultar las que ya están en uso
								filterAvailableTags('');
							});
						}
					}
					searchResults.classList.add('hidden');
					addToHistory(word);
				});
				searchResults.appendChild(resultElement);
			});
		} else {
			searchResults.classList.add('hidden');
		}
	});
});

// Función para mostrar etiquetas existentes
function showExistingTags(tags) {
	// Si se proporciona un string, extraer etiquetas
	if (typeof tags === 'string') {
		tags = extractTags(tags);
	}
	
	// Eliminar duplicados si hay
	if (Array.isArray(tags)) {
		tags = [...new Set(tags)];
	}
	
	// Buscar o crear el contenedor de etiquetas existentes
	let existingTagsContainer = document.getElementById('existing-tags');
	if (!existingTagsContainer) {
		existingTagsContainer = document.createElement('div');
		existingTagsContainer.id = 'existing-tags';
		existingTagsContainer.className = 'existing-tags';
		// Insertar después del textarea de definición y antes del panel de etiquetas disponibles
		const availableTagsContainer = document.getElementById('available-tags');
		if (availableTagsContainer && availableTagsContainer.parentNode) {
			availableTagsContainer.parentNode.insertBefore(existingTagsContainer, availableTagsContainer);
		} else {
			// Si no existe el panel de etiquetas disponibles, insertar después del textarea
			definitionTextArea.insertAdjacentElement('afterend', existingTagsContainer);
		}
	}
	
	// Limpiar el contenedor
	existingTagsContainer.innerHTML = '';
	
	// Si no hay etiquetas, ocultar el contenedor
	if (!tags || tags.length === 0) {
		existingTagsContainer.classList.add('hidden');
		return;
	}
	
	// Mostrar el título
	const titleElement = document.createElement('div');
	titleElement.className = 'existing-tags-label';
	titleElement.textContent = 'Tags:';
	existingTagsContainer.appendChild(titleElement);
	
	// Añadir cada etiqueta
	const tagsContainer = document.createElement('div');
	tagsContainer.className = 'existing-tags-list';
	
	tags.forEach(tag => {
		const tagElement = document.createElement('span');
		tagElement.className = 'existing-tag';
		tagElement.textContent = '#' + tag;
		// Al hacer clic en una etiqueta existente, insertarla en el cursor
		tagElement.addEventListener('click', () => {
			insertTagInTextarea(tag);
		});
		tagsContainer.appendChild(tagElement);
	});
	
	existingTagsContainer.appendChild(tagsContainer);
	existingTagsContainer.classList.remove('hidden');
}

// Resaltar etiquetas en tiempo real al escribir
definitionTextArea.addEventListener('input', async function(e) {
	// Resaltar etiquetas mientras el usuario escribe (solo visualmente)
	const definitionText = this.value;
	const formattedText = formatDefinitionWithTags(definitionText);
	
	// Extraer etiquetas y mostrarlas
	const tags = extractTags(definitionText);
	showExistingTags(tags);
	
	// Detectar si estamos escribiendo una etiqueta para mostrar el panel de etiquetas
	await detectTagWritingPanel(this);
});

// Cerrar los resultados de búsqueda al hacer clic fuera
document.addEventListener('click', (event) => {
	if (!searchResults.contains(event.target) && event.target !== wordInput) {
		searchResults.classList.add('hidden');
	}
});

// Exportar a JSON
document.getElementById('export-json').addEventListener('click', (event) => {
	event.preventDefault();
	loadData().then((data) => {
		// Opción 1: Exportar en formato nuevo (con etiquetas)
		const dataString = JSON.stringify(data || {});
		navigator.clipboard.writeText(dataString).then(() => {
			showNotification('Data exported in JSON format to clipboard', 'success');
		}).catch((err) => {
			console.log('Error copying data to clipboard', err);
			showNotification('Error exporting data', 'error');
		});
	});
});

// Exportar a CSV
document.getElementById('export-csv').addEventListener('click', (event) => {
	event.preventDefault();
	loadData().then((data) => {
		if (Object.keys(data).length === 0) {
			showNotification('No data to export', 'info');
			return;
		}
		
		let csvContent = 'Word,Definition,Tags\n';
		
		for (const word of Object.keys(data)) {
			const wordData = loadWord(word, data);
			if (!wordData) continue;
			
			// Escapar comillas y procesar para formato CSV
			const escapedWord = `"${word.replace(/"/g, '""')}"`;
			const escapedDefinition = `"${wordData.definition.replace(/"/g, '""')}"`;
			const tags = wordData.tags && wordData.tags.length > 0 ? 
				`"${wordData.tags.map(t => '#' + t).join(' ')}"` : '""';
			
			csvContent += `${escapedWord},${escapedDefinition},${tags}\n`;
		}
		
		navigator.clipboard.writeText(csvContent).then(() => {
			showNotification('Data exported in CSV format to clipboard', 'success');
		}).catch((err) => {
			console.log('Error copying CSV data to clipboard', err);
			showNotification('Error exporting data in CSV', 'error');
		});
	});
});

// Exportar a TXT
document.getElementById('export-txt').addEventListener('click', (event) => {
	event.preventDefault();
	loadData().then((data) => {
		if (Object.keys(data).length === 0) {
			showNotification('No data to export', 'info');
			return;
		}
		
		let txtContent = '';
		
		for (const word of Object.keys(data)) {
			const wordData = loadWord(word, data);
			if (!wordData) continue;
			
			txtContent += `${word}\n${wordData.definition}\n\n`;
		}
		
		navigator.clipboard.writeText(txtContent).then(() => {
			showNotification('Data exported in TXT format to clipboard', 'success');
		}).catch((err) => {
			console.log('Error copying TXT data to clipboard', err);
			showNotification('Error exporting data in TXT', 'error');
		});
	});
});

// Importar desde JSON
document.getElementById('import-json').addEventListener('click', async (event) => {
	event.preventDefault();
	try {
		const json = await navigator.clipboard.readText();
		if (!json) {
			showNotification('No data in clipboard', 'error');
			return;
		}
		
		const data = JSON.parse(json);
		if (typeof data !== 'object' || data === null) {
			showNotification('Invalid JSON format', 'error');
			return;
		}
		
		const oldData = await loadData();
		const newData = {...oldData, ...data};
		
		await saveData(newData);
		showNotification(`${Object.keys(data).length} words imported successfully`, 'success');
		
		// Actualizar la lista de palabras si está visible
		if (document.getElementById('wordlist-tab').classList.contains('active')) {
			loadWordsList();
		}
	} catch (err) {
		console.log('Error parsing JSON data', err);
		showNotification('Error importing JSON data', 'error');
	}
});

// Importar desde CSV
document.getElementById('import-csv').addEventListener('click', async (event) => {
	event.preventDefault();
	try {
		const csvText = await navigator.clipboard.readText();
		if (!csvText) {
			showNotification('No data in clipboard', 'error');
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
			showNotification('No valid data found in CSV', 'error');
			return;
		}
		
		const oldData = await loadData();
		const newData = {...oldData, ...data};
		
		await saveData(newData);
		showNotification(`${count} words imported from CSV`, 'success');
		
		// Actualizar la lista de palabras si está visible
		if (document.getElementById('wordlist-tab').classList.contains('active')) {
			loadWordsList();
		}
	} catch (err) {
		console.log('Error parsing CSV data', err);
		showNotification('Error importing CSV data', 'error');
	}
});

// Importar desde TXT
document.getElementById('import-txt').addEventListener('click', async (event) => {
	event.preventDefault();
	try {
		const txtText = await navigator.clipboard.readText();
		if (!txtText) {
			showNotification('No data in clipboard', 'error');
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
			showNotification('No valid data found in TXT', 'error');
			return;
		}
		
		const oldData = await loadData();
		const newData = {...oldData, ...data};
		
		await saveData(newData);
		showNotification(`${count} words imported from TXT`, 'success');
		
		// Actualizar la lista de palabras si está visible
		if (document.getElementById('wordlist-tab').classList.contains('active')) {
			loadWordsList();
		}
	} catch (err) {
		console.log('Error parsing TXT data', err);
		showNotification('Error importing TXT data', 'error');
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
	if (confirm('Are you sure you want to delete all data?')) {
		deleteData();
		showNotification('All data has been deleted', 'info');
		// Actualizar la lista de palabras si está visible
		if (document.getElementById('wordlist-tab').classList.contains('active')) {
			loadWordsList();
		}
	}
});

const saveData = (data) => {
	return chrome.storage.local.set({data: data})
		.then(() => {
			console.log("Datos guardados exitosamente");
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
	console.log("Datos eliminados exitosamente");
}

// Función para detectar si estamos escribiendo una etiqueta y mostrar el panel
async function detectTagWritingPanel(textarea) {
	const text = textarea.value;
	const cursorPos = textarea.selectionStart;
	
	// Verificar si hay algún # en el texto
	const hasHash = text.includes('#');
	
	// Si hay un # en el texto y el panel no está activo, mostrarlo
	if (hasHash && !isWritingTag) {
		isWritingTag = true;
		await showAvailableTagsPanel();
		// Filtrar inmediatamente para ocultar etiquetas ya utilizadas
		filterAvailableTags('');
	} 
	// Si no hay # en el texto pero el panel está activo, ocultarlo
	else if (!hasHash && isWritingTag) {
		isWritingTag = false;
		hideAvailableTagsPanel();
		return;
	}
	
	// Si no estamos escribiendo una etiqueta, no continuar
	if (!isWritingTag) return;
	
	// Encontrar el tag actual que está escribiendo (si existe)
	let partialTag = '';
	let hashPos = -1;
	
	// Buscar el # más cercano al cursor
	for (let i = cursorPos - 1; i >= 0; i--) {
		if (text[i] === '#') {
			hashPos = i;
			break;
		} else if (/\s/.test(text[i])) {
			break;
		}
	}
	
	if (hashPos !== -1) {
		// Buscar el final del tag
		let tagEnd = cursorPos;
		for (let i = cursorPos; i < text.length; i++) {
			if (/\s/.test(text[i])) {
				tagEnd = i;
				break;
			}
		}
		
		partialTag = text.substring(hashPos + 1, tagEnd);
		
		// Actualizar el filtro de etiquetas en el panel
		filterAvailableTags(partialTag);
	} else {
		// Si no hay un # cercano al cursor, mostrar todas las etiquetas sin filtrar
		// pero ocultando las que ya están en uso
		filterAvailableTags('');
	}
}

// Función para mostrar el panel de etiquetas disponibles
async function showAvailableTagsPanel() {
	const availableTagsContainer = document.getElementById('available-tags');
	
	// Si el panel ya está visible, no hacer nada
	if (!availableTagsContainer.classList.contains('hidden')) {
		return Promise.resolve();
	}
	
	// Cargar todas las etiquetas
	const allTags = await loadAllTags();
	
	// Limpiar el contenedor
	availableTagsContainer.innerHTML = '';
	
	// Si no hay etiquetas, mostrar mensaje
	if (allTags.length === 0) {
		const noTagsMessage = document.createElement('div');
		noTagsMessage.className = 'no-tags-message';
		noTagsMessage.textContent = 'No tags available';
		availableTagsContainer.appendChild(noTagsMessage);
	} else {
		// Añadir cada etiqueta al contenedor (sin título)
		allTags.forEach(tag => {
			const tagElement = document.createElement('span');
			tagElement.className = 'available-tag';
			tagElement.dataset.tag = tag;
			tagElement.textContent = '#' + tag;
			
			// Al hacer clic, insertar la etiqueta en el textarea
			tagElement.addEventListener('click', () => {
				insertTagInTextarea(tag);
			});
			
			availableTagsContainer.appendChild(tagElement);
		});
	}
	
	// Mostrar el contenedor
	availableTagsContainer.classList.remove('hidden');
	
	// Devolver una promesa resuelta para permitir encadenamiento
	return Promise.resolve();
}

// Función para filtrar las etiquetas mostradas según lo que se está escribiendo
function filterAvailableTags(partialTag) {
	const availableTagsContainer = document.getElementById('available-tags');
	if (!availableTagsContainer || availableTagsContainer.classList.contains('hidden')) return;
	
	// Obtener las etiquetas que ya se están utilizando en la definición actual
	const currentTags = extractTags(definitionTextArea.value);
	
	const tagElements = availableTagsContainer.querySelectorAll('.available-tag');
	let hasVisibleTags = false;
	
	// Eliminar cualquier mensaje previo
	const prevMessage = availableTagsContainer.querySelector('.no-match-message');
	if (prevMessage) prevMessage.remove();
	
	// Procesar cada etiqueta disponible
	tagElements.forEach(el => {
		const tag = el.dataset.tag;
		
		// Ocultar las etiquetas que ya están siendo utilizadas
		if (currentTags.includes(tag)) {
			el.style.display = 'none';
			return;
		}
		
		// Si hay texto parcial, filtrar por coincidencia
		if (partialTag && partialTag.trim() !== '') {
			if (tag.toLowerCase().includes(partialTag.toLowerCase())) {
				el.style.display = '';
				hasVisibleTags = true;
				
				// Resaltar la parte coincidente
				const regex = new RegExp(`(${partialTag})`, 'i');
				el.innerHTML = '#' + tag.replace(regex, '<span class="tag-highlight">$1</span>');
				
				// Mover las coincidencias exactas al principio
				if (tag.toLowerCase().startsWith(partialTag.toLowerCase())) {
					availableTagsContainer.insertBefore(el, availableTagsContainer.firstChild);
				}
			} else {
				el.style.display = 'none';
			}
		} else {
			// Si no hay texto parcial, mostrar todas excepto las ya usadas
			el.style.display = '';
			el.textContent = '#' + tag;
			hasVisibleTags = true;
		}
	});
	
	// Si no hay etiquetas visibles, mostrar un mensaje
	if (!hasVisibleTags && tagElements.length > 0) {
		const message = document.createElement('div');
		message.className = 'no-match-message';
		
		if (currentTags.length > 0) {
			message.textContent = partialTag ? 
				'No matching tags available' : 
				'You are already using all available tags';
		} else {
			message.textContent = 'No matches';
		}
		
		availableTagsContainer.appendChild(message);
	}
}

// Función para extraer etiquetas únicas de una definición (para evitar duplicados)
function extractTags(definition) {
	const tagRegex = /#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+)/g;
	const matches = definition.match(tagRegex) || [];
	
	// Eliminar duplicados manteniendo solo la primera aparición de cada etiqueta
	const uniqueTags = [...new Set(matches.map(tag => tag.substring(1)))];
	return uniqueTags;
}

function formatDefinitionWithTags(definition) {
	// Resaltar las etiquetas en el texto de la definición
	// Usamos un conjunto para rastrear etiquetas ya vistas y aplicar estilos diferentes a duplicados
	const seenTags = new Set();
	
	// Reemplazamos cada etiqueta, pero rastreamos cuáles ya hemos visto
	return definition.replace(/#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+)/g, (match, tag) => {
		// Si ya hemos visto esta etiqueta, aplicar un estilo diferente
		if (seenTags.has(tag.toLowerCase())) {
			return `<span class="tag tag-duplicate">${match}</span>`;
		}
		
		// Agregar a etiquetas vistas
		seenTags.add(tag.toLowerCase());
		return `<span class="tag">${match}</span>`;
	});
}

// Función para cargar una palabra (compatible con ambos formatos)
function loadWord(key, data) {
	// Caso 1: Formato nuevo (objeto con definition y tags)
	if (data[key] && typeof data[key] === 'object' && data[key].definition) {
		return {
			definition: data[key].definition,
			tags: data[key].tags || []
		};
	}
	
	// Caso 2: Formato antiguo (string directo)
	else if (data[key] && typeof data[key] === 'string') {
		// Extraer etiquetas del texto existente si las hay
		const definition = data[key];
		const tags = extractTags(definition);
		
		return {
			definition: definition,
			tags: tags
		};
	}
	
	return null;
}

// Función para obtener datos de una palabra en formato consistente
function getWordData(word, data) {
	const wordData = loadWord(word, data);
	if (!wordData) return null;
	
	return {
		definition: wordData.definition,
		tags: wordData.tags
	};
}

// Función para guardar una palabra en el nuevo formato
function saveWord(word, definition, data) {
	// Extraer etiquetas del texto
	const tags = extractTags(definition);
	
	// Guardar en nuevo formato
	data[word] = {
		definition: definition,
		tags: tags
	};
	
	return data;
}

// Verificar formato de datos al cargar
async function checkDataFormat() {
	const data = await loadData();
	let needsMigration = false;
	
	// Verificar si hay al menos una entrada en formato antiguo
	for (const word in data) {
		if (typeof data[word] === 'string') {
			needsMigration = true;
			break;
		}
	}
	
	return data;
}

// Modificar la función para cargar todas las etiquetas únicas
async function loadAllTags() {
	const data = await loadData();
	let allTags = new Set();
	
	for (const word in data) {
		const wordData = loadWord(word, data);
		if (wordData && wordData.tags) {
			wordData.tags.forEach(tag => allTags.add(tag));
		}
	}
	
	return Array.from(allTags).sort();
}

// Función para mostrar/ocultar las etiquetas disponibles (botón info)
// Esta función ya no se usa porque eliminamos el botón, pero la mantenemos por compatibilidad
async function toggleAvailableTags() {
	const availableTagsContainer = document.getElementById('available-tags');
	
	// Si ya está visible, ocultarlo
	if (!availableTagsContainer.classList.contains('hidden')) {
		availableTagsContainer.classList.add('hidden');
		isWritingTag = false;
		return;
	}
	
	// Mostrar el panel
	isWritingTag = true;
	await showAvailableTagsPanel();
}

// Cerrar panel de etiquetas al hacer clic fuera del textarea y del panel
document.addEventListener('click', (event) => {
	const availableTagsContainer = document.getElementById('available-tags');
	
	// Si el clic fue fuera del panel y del textarea, cerrar el panel
	if (availableTagsContainer && !availableTagsContainer.contains(event.target) && 
		event.target !== definitionTextArea) {
		hideAvailableTagsPanel();
		isWritingTag = false;
	}
});

// Eliminar las funciones antiguas de sugerencias flotantes que ya no se utilizarán
function closeSuggestions() {
	// Esta función se mantiene para compatibilidad, pero ahora simplemente cierra el panel
	hideAvailableTagsPanel();
	isWritingTag = false;
	suggestionsActive = false;
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
	// Iniciar en la pestaña principal
	switchTab('main');
	
	// Crear el contenedor de vista previa de etiquetas si no existe
	if (!document.getElementById('tags-preview')) {
		const tagsPreview = document.createElement('div');
		tagsPreview.id = 'tags-preview';
		tagsPreview.className = 'tags-preview hidden';
		// Insertar después del textarea de definición
		definitionTextArea.insertAdjacentElement('afterend', tagsPreview);
	}
	
	// Verificar si necesitamos migrar datos (para usuarios existentes)
	await checkDataFormat();
	
	// Cargar las etiquetas si está en la pestaña de palabras
	if (document.getElementById('wordlist-tab').classList.contains('active')) {
		await loadTagsFilter();
	}
	
	// Inicializar las etiquetas existentes para la palabra actual (si hay)
	if (wordInput.value) {
		loadData().then(data => {
			const word = wordInput.value;
			if (data[word]) {
				const wordData = loadWord(word, data);
				if (wordData && wordData.tags) {
					showExistingTags(wordData.tags);
				}
			}
		});
	}
});

// Función para ocultar el panel de etiquetas disponibles
function hideAvailableTagsPanel() {
	const availableTagsContainer = document.getElementById('available-tags');
	availableTagsContainer.classList.add('hidden');
}

// Función para insertar una etiqueta en el textarea
function insertTagInTextarea(tag) {
	// Obtener la posición actual del cursor
	const cursorPos = definitionTextArea.selectionStart;
	const text = definitionTextArea.value;
	
	// Buscar si ya hay un # cerca del cursor que se esté editando
	let hashPos = -1;
	let tagEnd = cursorPos;
	
	for (let i = cursorPos - 1; i >= 0; i--) {
		if (text[i] === '#') {
			hashPos = i;
			break;
		} else if (/\s/.test(text[i])) {
			break;
		}
	}
	
	// Buscar el final del tag si existe
	if (hashPos !== -1) {
		for (let i = hashPos + 1; i < text.length; i++) {
			if (/\s/.test(text[i])) {
				tagEnd = i;
				break;
			}
		}
		if (tagEnd === cursorPos) {
			tagEnd = text.length;
		}
		
		// Reemplazar el tag parcial con el tag completo
		const newText = text.substring(0, hashPos + 1) + tag + ' ' + text.substring(tagEnd);
		definitionTextArea.value = newText;
		
		// Mover el cursor después del tag insertado
		const newCursorPos = hashPos + tag.length + 2; // +2 para el # y el espacio
		definitionTextArea.setSelectionRange(newCursorPos, newCursorPos);
	} else {
		// Determinar si necesitamos un espacio antes del tag
		const needsSpace = cursorPos > 0 && text.charAt(cursorPos - 1) !== ' ' && text.charAt(cursorPos - 1) !== '\n';
		
		// Crear el texto a insertar
		const insertText = (needsSpace ? ' ' : '') + '#' + tag + ' ';
		
		// Insertar la etiqueta en la posición del cursor
		const newText = text.substring(0, cursorPos) + insertText + text.substring(cursorPos);
		definitionTextArea.value = newText;
		
		// Mover el cursor después de la etiqueta insertada
		const newCursorPos = cursorPos + insertText.length;
		definitionTextArea.setSelectionRange(newCursorPos, newCursorPos);
	}
	
	// Actualizar la vista previa de etiquetas
	definitionTextArea.dispatchEvent(new Event('input'));
	
	// Mantener el foco en el textarea
	definitionTextArea.focus();
}
