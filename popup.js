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

// Función para cargar y mostrar la lista de palabras
const loadWordsList = async (filter = '', tagFilter = null) => {
	const data = await loadData();
	const words = Object.keys(data);
	
	// Limpiar lista existente
	wordsList.innerHTML = '';
	
	if (words.length === 0) {
		const emptyMessage = document.createElement('div');
		emptyMessage.className = 'empty-message';
		emptyMessage.textContent = 'No hay palabras guardadas';
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
			`No hay palabras con la etiqueta #${tagFilter}` : 
			'No hay palabras que coincidan con la búsqueda';
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
		editBtn.textContent = 'Editar';
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
		deleteBtn.textContent = 'Borrar';
		deleteBtn.addEventListener('click', async (e) => {
			e.stopPropagation();
			if (confirm(`¿Estás seguro de que deseas eliminar "${word}"?`)) {
				const currentData = await loadData();
				delete currentData[word];
				await saveData(currentData);
				showNotification(`"${word}" ha sido eliminado`, 'info');
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
			definitionTextArea.value = wordData ? wordData.definition : '';
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
			Filtrando por: <span class="active-tag">#${tag}</span>
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
		tagsContainer.innerHTML = '<div class="empty-tags">No hay etiquetas disponibles</div>';
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
		emptyMessage.textContent = 'No hay búsquedas recientes';
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
	if (confirm('¿Estás seguro de que deseas limpiar todo el historial?')) {
		await saveHistory([]);
		loadHistoryList();
		showNotification('Historial limpiado', 'info');
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
				showNotification(`"${wordInput.value}" se ha guardado exitosamente`, 'success');
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
		showNotification('Por favor ingresa tanto la palabra como la definición', 'error');
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
			}
		} else {
			definitionTextArea.value = '';
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
			showNotification('Datos exportados en formato JSON al portapapeles', 'success');
		}).catch((err) => {
			console.log('Error al copiar datos al portapapeles', err);
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
		
		let csvContent = 'Palabra,Definición,Etiquetas\n';
		
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
			showNotification('Datos exportados en formato CSV al portapapeles', 'success');
		}).catch((err) => {
			console.log('Error al copiar datos CSV al portapapeles', err);
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
		
		for (const word of Object.keys(data)) {
			const wordData = loadWord(word, data);
			if (!wordData) continue;
			
			txtContent += `${word}\n${wordData.definition}\n\n`;
		}
		
		navigator.clipboard.writeText(txtContent).then(() => {
			showNotification('Datos exportados en formato TXT al portapapeles', 'success');
		}).catch((err) => {
			console.log('Error al copiar datos TXT al portapapeles', err);
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
		
		// Actualizar la lista de palabras si está visible
		if (document.getElementById('wordlist-tab').classList.contains('active')) {
			loadWordsList();
		}
	} catch (err) {
		console.log('Error al analizar datos JSON', err);
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
		
		// Actualizar la lista de palabras si está visible
		if (document.getElementById('wordlist-tab').classList.contains('active')) {
			loadWordsList();
		}
	} catch (err) {
		console.log('Error al analizar datos CSV', err);
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
		
		// Actualizar la lista de palabras si está visible
		if (document.getElementById('wordlist-tab').classList.contains('active')) {
			loadWordsList();
		}
	} catch (err) {
		console.log('Error al analizar datos TXT', err);
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

// Resaltar etiquetas en tiempo real al escribir
definitionTextArea.addEventListener('input', function() {
	// Resaltar etiquetas mientras el usuario escribe (solo visualmente)
	const definitionText = this.value;
	const formattedText = formatDefinitionWithTags(definitionText);
	
	// Si hay etiquetas, mostrar una pequeña nota informativa
	const tagsPreview = document.getElementById('tags-preview');
	const tags = extractTags(definitionText);
	
	if (tags.length > 0) {
		tagsPreview.innerHTML = `<span class="tags-preview-label">Etiquetas:</span> ${tags.map(tag => `<span class="tag-preview">#${tag}</span>`).join(' ')}`;
		tagsPreview.classList.remove('hidden');
	} else {
		tagsPreview.classList.add('hidden');
	}
});

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
});

// Funciones para el manejo de etiquetas
function extractTags(definition) {
	const tagRegex = /#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+)/g;
	const matches = definition.match(tagRegex) || [];
	return matches.map(tag => tag.substring(1)); // Eliminar el # del inicio
}

function formatDefinitionWithTags(definition) {
	// Resaltar las etiquetas en el texto de la definición
	return definition.replace(/#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+)/g, '<span class="tag">#$1</span>');
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
