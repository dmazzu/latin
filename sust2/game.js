const caseLabels = {
        nom_sg: "Nom.", gen_sg: "Gen.", dat_sg: "Dat.", acc_sg: "Acus.", abl_sg: "Abl.",
        nom_pl: "Nom.", gen_pl: "Gen.", dat_pl: "Dat.", acc_pl: "Acus.", abl_pl: "Abl."
    };

    const caseOrder = ['nom', 'gen', 'dat', 'acc', 'abl'];

    let gameState = {
        filteredExercises: [],
        currentExerciseIndex: 0,
        availableWords: [],
        slotAssignments: [],
        selectedCases: {},
        activePanelSlotIndex: null
    };

    function shuffleArray(array) {
        let newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    }

    function initMenu() {
        document.getElementById('lm-btn-start').addEventListener('click', startGame);
        document.getElementById('lm-btn-return-menu').addEventListener('click', showMenu);
        
        document.getElementById('lm-btn-check').addEventListener('click', onCheckAnswer);
        document.getElementById('lm-btn-next').addEventListener('click', onNextExercise);
        document.getElementById('lm-btn-close-panel').addEventListener('click', closeCasePanel);
        document.getElementById('lm-btn-remove-word').addEventListener('click', onRemoveWordFromPanel);
    }

    function showMenu() {
        document.getElementById('latin-mini-game').style.display = 'none';
        document.getElementById('lm-menu-screen').style.display = 'block';
    }

    
    function startGame() {
        const selectedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);
        const quantityStr = document.getElementById('lm-select-quantity').value;
        
        if (selectedCategories.length === 0) {
            alert("Debes seleccionar al menos una categoría.");
            return;
        }

        let filtered = allExercises.filter(ex => selectedCategories.includes(ex.category));
        filtered = shuffleArray(filtered);
        
        if (quantityStr !== 'all') {
            const qty = parseInt(quantityStr, 10);
            filtered = filtered.slice(0, qty);
        }
        
        if (filtered.length === 0) return; // Failsafe
        
        gameState.filteredExercises = filtered;
gameState.filteredExercises = filtered;
        gameState.currentExerciseIndex = 0;
        
        document.getElementById('lm-menu-screen').style.display = 'none';
        document.getElementById('latin-mini-game').style.display = 'block';
        
        loadExercise(0);
    }

    function loadExercise(index) {
        const exercise = gameState.filteredExercises[index];
        gameState.currentExerciseIndex = index;
        gameState.availableWords = shuffleArray(exercise.wordBank);
        gameState.slotAssignments = new Array(exercise.targetSlots.length).fill(null);
        gameState.selectedCases = {};
        gameState.activePanelSlotIndex = null;

        document.getElementById('lm-progress').innerText = `Ejercicio ${index + 1} / ${gameState.filteredExercises.length}`;
        
        const imgEl = document.getElementById('lm-scene-image');
        const placeholderEl = document.getElementById('lm-image-placeholder');
        
        imgEl.style.display = 'block';
        placeholderEl.style.display = 'none';
        imgEl.src = exercise.image;
        
        imgEl.onerror = () => { 
            imgEl.style.display = 'none'; 
            placeholderEl.style.display = 'block';
            placeholderEl.innerText = `[Imagen visual de la escena: ${exercise.image}]`; 
        };
        
        document.getElementById('lm-spanish-sentence').innerText = exercise.spanishSentence;
        
        hideFeedback();
        document.getElementById('lm-btn-check').style.display = 'block';
        document.getElementById('lm-btn-next').style.display = 'none';

        renderSlots();
        renderWordBank();
    }

    function renderSlots() {
        const container = document.getElementById('lm-slots-container');
        container.innerHTML = '';
        gameState.slotAssignments.forEach((word, index) => {
            const slotEl = document.createElement('div');
            slotEl.className = 'lm-slot' + (word ? ' filled' : '');
            
            if (word) {
                const wordSpan = document.createElement('span');
                wordSpan.className = 'lm-slot-word';
                wordSpan.innerText = word;
                slotEl.appendChild(wordSpan);

                if (gameState.selectedCases[index]) {
                    const caseSpan = document.createElement('span');
                    caseSpan.className = 'lm-slot-case';
                    caseSpan.innerText = caseLabels[gameState.selectedCases[index]] || gameState.selectedCases[index];
                    slotEl.appendChild(caseSpan);
                }
                slotEl.addEventListener('click', () => onFilledSlotClick(index, word));
            }
            container.appendChild(slotEl);
        });
    }

    function renderWordBank() {
        const container = document.getElementById('lm-word-bank');
        container.innerHTML = '';
        gameState.availableWords.forEach((word, index) => {
            const wordEl = document.createElement('div');
            wordEl.className = 'lm-word';
            wordEl.innerText = word;
            wordEl.addEventListener('click', () => onWordBankClick(index));
            container.appendChild(wordEl);
        });
    }

    function renderFeedback(isCorrect, message) {
        const feedbackEl = document.getElementById('lm-feedback');
        feedbackEl.className = `lm-feedback show ${isCorrect ? 'correct' : 'incorrect'}`;
        feedbackEl.innerText = message;
    }

    function hideFeedback() {
        document.getElementById('lm-feedback').className = 'lm-feedback';
    }

    function getLemmaByForm(form) {
        for (const [lemma, data] of Object.entries(paradigms)) {
            if (lemma === form || Object.values(data.forms).includes(form)) {
                return { lemma, data };
            }
        }
        return null;
    }

    
    function onWordBankClick(wordIndex) {
        const word = gameState.availableWords[wordIndex];
        const targetSlots = gameState.filteredExercises[gameState.currentExerciseIndex].targetSlots;

        // Buscar el slot correcto para esta palabra (sea lema o invariable)
        let targetIndex = targetSlots.findIndex((slot, idx) => {
            const matchesLemma = slot.lemma === word;
            const matchesCorrect = slot.correct === word;
            return (matchesLemma || matchesCorrect) && gameState.slotAssignments[idx] === null;
        });

        // Si es un distractor (no pertenece a la oración) o el slot correcto ya está ocupado, buscar el primer espacio vacío
        if (targetIndex === -1) {
            targetIndex = gameState.slotAssignments.findIndex(slot => slot === null);
        }

        if (targetIndex !== -1) {
            gameState.slotAssignments[targetIndex] = word;
            gameState.availableWords.splice(wordIndex, 1);
            renderSlots();
            renderWordBank();
            hideFeedback();
        }
    }
function onFilledSlotClick(slotIndex, word) {
        const lemmaInfo = getLemmaByForm(word);
        if (lemmaInfo) {
            openCasePanel(slotIndex, word, lemmaInfo);
        } else {
            removeWordFromSlot(slotIndex);
        }
    }

    
    function removeWordFromSlot(slotIndex) {
        const wordInSlot = gameState.slotAssignments[slotIndex];
        if (wordInSlot) {
            // Siempre devolvemos el lema original al banco, no la forma declinada
            let wordToReturn = wordInSlot;
            const lemmaInfo = getLemmaByForm(wordInSlot);
            if (lemmaInfo) {
                wordToReturn = lemmaInfo.lemma;
            }

            gameState.slotAssignments[slotIndex] = null;
            delete gameState.selectedCases[slotIndex];
            gameState.availableWords.push(wordToReturn);
            renderSlots();
            renderWordBank();
            hideFeedback();
        }
    }
function openCasePanel(slotIndex, word, lemmaInfo) {
        gameState.activePanelSlotIndex = slotIndex;
        const panel = document.getElementById('lm-case-panel-overlay');
        const title = document.getElementById('lm-lemma-title');
        const grid = document.getElementById('lm-case-grid');
        
        title.innerText = `${lemmaInfo.lemma}, ${lemmaInfo.data.forms.gen_sg}, ${lemmaInfo.data.gender}.`;
        grid.innerHTML = '';
        
        // Encabezados de columna
        grid.innerHTML += `
            <div class="lm-case-grid-header"></div>
            <div class="lm-case-grid-header">Singular</div>
            <div class="lm-case-grid-header">Plural</div>
        `;

        const selectedCase = gameState.selectedCases[slotIndex];

        caseOrder.forEach(caseName => {
            // Etiqueta de la fila
            const rowLabel = document.createElement('div');
            rowLabel.className = 'lm-case-row-label';
            rowLabel.innerText = caseName;
            grid.appendChild(rowLabel);

            // Botón Singular
            const sgKey = `${caseName}_sg`;
            const sgBtn = document.createElement('button');
            sgBtn.className = `lm-case-btn ${selectedCase === sgKey ? 'selected' : ''}`;
            sgBtn.innerText = lemmaInfo.data.forms[sgKey];
            sgBtn.addEventListener('click', () => onCaseSelect(sgKey));
            grid.appendChild(sgBtn);

            // Botón Plural
            const plKey = `${caseName}_pl`;
            const plBtn = document.createElement('button');
            plBtn.className = `lm-case-btn ${selectedCase === plKey ? 'selected' : ''}`;
            plBtn.innerText = lemmaInfo.data.forms[plKey];
            plBtn.addEventListener('click', () => onCaseSelect(plKey));
            grid.appendChild(plBtn);
        });

        panel.style.display = 'flex';
    }

    function closeCasePanel() {
        document.getElementById('lm-case-panel-overlay').style.display = 'none';
        gameState.activePanelSlotIndex = null;
    }

    function onCaseSelect(caseKey) {
        if (gameState.activePanelSlotIndex !== null) {
            gameState.selectedCases[gameState.activePanelSlotIndex] = caseKey;
            
            // Actualizar la visualización de la palabra en el slot con la forma declinada
            const slotIndex = gameState.activePanelSlotIndex;
            const originalWord = gameState.slotAssignments[slotIndex];
            const lemmaInfo = getLemmaByForm(originalWord);
            if (lemmaInfo) {
                gameState.slotAssignments[slotIndex] = lemmaInfo.data.forms[caseKey];
            }
            
            renderSlots();
            closeCasePanel();
            hideFeedback();
        }
    }

    
    function onRemoveWordFromPanel() {
        if (gameState.activePanelSlotIndex !== null) {
            removeWordFromSlot(gameState.activePanelSlotIndex);
            closeCasePanel();
        }
    }
function onCheckAnswer() {
        const exercise = gameState.filteredExercises[gameState.currentExerciseIndex];
        
        let isCorrect = true;
        let errorMessage = "";

        const isComplete = gameState.slotAssignments.every(word => word !== null);
        if (!isComplete) {
            renderFeedback(false, "Debes llenar todos los espacios antes de comprobar.");
            return;
        }

        for (let i = 0; i < exercise.targetSlots.length; i++) {
            const target = exercise.targetSlots[i];
            const assignedWord = gameState.slotAssignments[i];

            if (target.lemma) {
                // Es declinable
                const lemmaInfo = getLemmaByForm(assignedWord);
                if (!lemmaInfo || lemmaInfo.lemma !== target.lemma) {
                    isCorrect = false;
                    errorMessage = `La palabra elegida no corresponde a la frase.`;
                    break;
                }
                
                const selectedCase = gameState.selectedCases[i];
                if (!selectedCase) {
                    isCorrect = false;
                    errorMessage = `Falta seleccionar el caso para '${assignedWord}'.`;
                    break;
                }
                
                if (selectedCase !== target.targetCase) {
                    isCorrect = false;
                    errorMessage = `El caso seleccionado para '${lemmaInfo.lemma}' no es correcto.`;
                    break;
                }
            } else {
                // Palabra invariable
                if (assignedWord !== target.correct) {
                    isCorrect = false;
                    errorMessage = "Hay palabras en el orden incorrecto o no corresponden a la frase.";
                    break;
                }
            }
        }

        renderFeedback(isCorrect, isCorrect ? "¡Correcto! Has resuelto esta combinación." : errorMessage);

        if (isCorrect) {
            document.getElementById('lm-btn-check').style.display = 'none';
            
            // Dispatch custom event para el juego
            document.dispatchEvent(new CustomEvent('carcania:exerciseResolved', {
                detail: {
                    exerciseId: exercise.id,
                    success: true,
                    combinations: exercise.targetSlots
                        .filter(slot => slot.lemma)
                        .map(slot => `${slot.lemma}|${slot.targetCase}`)
                }
            }));

            if (gameState.currentExerciseIndex < gameState.filteredExercises.length - 1) {
                document.getElementById('lm-btn-next').style.display = 'block';
            } else {
                renderFeedback(true, "¡Excelente! Has completado la sesión de práctica.");
            }
        }
    }

    function onNextExercise() {
        if (gameState.currentExerciseIndex < gameState.filteredExercises.length - 1) {
            loadExercise(gameState.currentExerciseIndex + 1);
        }
    }

    document.addEventListener('DOMContentLoaded', initMenu);