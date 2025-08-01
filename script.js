// Estado de la aplicación
let completedSubjects = new Set();
let subjectData = {};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeSubjects();
    updateProgress();
    loadProgress();
});

// Inicializar datos de las materias
function initializeSubjects() {
    const subjects = document.querySelectorAll('.subject');
    const totalCountElement = document.getElementById('totalCount');
    
    totalCountElement.textContent = subjects.length;
    
    subjects.forEach(subject => {
        const subjectId = subject.dataset.subject;
        const requires = subject.dataset.requires ? subject.dataset.requires.split(',') : [];
        const unlocks = subject.dataset.unlocks ? subject.dataset.unlocks.split(',').filter(item => item.trim()) : [];
        
        subjectData[subjectId] = {
            element: subject,
            requires: requires,
            unlocks: unlocks,
            completed: false
        };
        
        // Agregar event listener
        subject.addEventListener('click', () => handleSubjectClick(subjectId));
    });
    
    updateSubjectStates();
}

// Manejar click en materia
function handleSubjectClick(subjectId) {
    const subject = subjectData[subjectId];
    
    if (!subject) return;
    
    if (subject.element.classList.contains('blocked')) {
        showRequirements(subjectId);
        return;
    }
    
    if (subject.completed) {
        // Desaprobar materia
        unapproveSubject(subjectId);
    } else {
        // Aprobar materia
        approveSubject(subjectId);
    }
    
    updateSubjectStates();
    updateProgress();
    saveProgress();
}

// Aprobar materia
function approveSubject(subjectId) {
    const subject = subjectData[subjectId];
    
    if (!subject || subject.completed) return;
    
    subject.completed = true;
    completedSubjects.add(subjectId);
    
    // Efectos visuales
    subject.element.classList.add('pulse');
    setTimeout(() => {
        subject.element.classList.remove('pulse');
    }, 800);
    
    // Desbloquear materias dependientes
    unlockDependentSubjects(subjectId);
}

// Desaprobar materia
function unapproveSubject(subjectId) {
    const subject = subjectData[subjectId];
    
    if (!subject || !subject.completed) return;
    
    // Verificar si hay materias dependientes aprobadas
    const dependentSubjects = findDependentSubjects(subjectId);
    const approvedDependents = dependentSubjects.filter(id => subjectData[id]?.completed);
    
    if (approvedDependents.length > 0) {
        showDependentWarning(subjectId, approvedDependents);
        return;
    }
    
    // Desaprobar la materia
    subject.completed = false;
    completedSubjects.delete(subjectId);
    
    // Efectos visuales
    subject.element.classList.add('pulse');
    setTimeout(() => {
        subject.element.classList.remove('pulse');
    }, 800);
}

// Desbloquear materias dependientes
function unlockDependentSubjects(subjectId) {
    const subject = subjectData[subjectId];
    
    if (!subject || !subject.unlocks) return;
    
    subject.unlocks.forEach(dependentId => {
        const dependentSubject = subjectData[dependentId];
        if (dependentSubject && !dependentSubject.completed) {
            // Animación de desbloqueo
            setTimeout(() => {
                if (isSubjectAvailable(dependentId)) {
                    dependentSubject.element.classList.add('unlocking');
                    setTimeout(() => {
                        dependentSubject.element.classList.remove('unlocking');
                    }, 600);
                }
            }, 200);
        }
    });
}

// Verificar si una materia está disponible
function isSubjectAvailable(subjectId) {
    const subject = subjectData[subjectId];
    
    if (!subject || subject.completed) return false;
    
    // Si no tiene requisitos, está disponible
    if (!subject.requires || subject.requires.length === 0) return true;
    
    // Verificar que todos los requisitos estén aprobados
    return subject.requires.every(requiredId => {
        const requiredSubject = subjectData[requiredId];
        return requiredSubject && requiredSubject.completed;
    });
}

// Actualizar estados de todas las materias
function updateSubjectStates() {
    Object.keys(subjectData).forEach(subjectId => {
        const subject = subjectData[subjectId];
        const element = subject.element;
        
        // Limpiar clases anteriores
        element.classList.remove('available', 'blocked', 'completed');
        
        if (subject.completed) {
            element.classList.add('completed');
        } else if (isSubjectAvailable(subjectId)) {
            element.classList.add('available');
        } else {
            element.classList.add('blocked');
        }
    });
}

// Encontrar materias dependientes
function findDependentSubjects(subjectId) {
    const dependents = [];
    
    Object.keys(subjectData).forEach(id => {
        const subject = subjectData[id];
        if (subject.requires && subject.requires.includes(subjectId)) {
            dependents.push(id);
        }
    });
    
    return dependents;
}

// Mostrar requisitos de una materia bloqueada
function showRequirements(subjectId) {
    const subject = subjectData[subjectId];
    
    if (!subject || !subject.requires) return;
    
    const subjectName = subject.element.querySelector('.subject-name').textContent;
    const missingRequirements = subject.requires.filter(reqId => {
        const reqSubject = subjectData[reqId];
        return reqSubject && !reqSubject.completed;
    });
    
    if (missingRequirements.length > 0) {
        const reqNames = missingRequirements.map(reqId => {
            const reqSubject = subjectData[reqId];
            return reqSubject ? reqSubject.element.querySelector('.subject-name').textContent : reqId;
        });
        
        alert(`Para desbloquear "${subjectName}" necesitas aprobar:\n\n• ${reqNames.join('\n• ')}`);
        
        // Resaltar requisitos faltantes
        missingRequirements.forEach(reqId => {
            const reqSubject = subjectData[reqId];
            if (reqSubject) {
                reqSubject.element.classList.add('pulse');
                setTimeout(() => {
                    reqSubject.element.classList.remove('pulse');
                }, 1200);
            }
        });
    }
}

// Mostrar advertencia de materias dependientes
function showDependentWarning(subjectId, dependentSubjects) {
    const subject = subjectData[subjectId];
    const subjectName = subject.element.querySelector('.subject-name').textContent;
    
    const dependentNames = dependentSubjects.map(depId => {
        const depSubject = subjectData[depId];
        return depSubject ? depSubject.element.querySelector('.subject-name').textContent : depId;
    });
    
    const proceed = confirm(
        `No puedes desaprobar "${subjectName}" porque las siguientes materias dependen de ella:\n\n• ${dependentNames.join('\n• ')}\n\n¿Deseas desaprobar todas estas materias también?`
    );
    
    if (proceed) {
        // Desaprobar todas las materias dependientes primero
        dependentSubjects.forEach(depId => {
            unapproveSubjectRecursive(depId);
        });
        
        // Luego desaprobar la materia original
        const subjectData_local = subjectData[subjectId];
        subjectData_local.completed = false;
        completedSubjects.delete(subjectId);
        
        updateSubjectStates();
        updateProgress();
        saveProgress();
    }
}

// Desaprobar materia de forma recursiva
function unapproveSubjectRecursive(subjectId) {
    const subject = subjectData[subjectId];
    
    if (!subject || !subject.completed) return;
    
    // Encontrar y desaprobar materias dependientes primero
    const dependentSubjects = findDependentSubjects(subjectId);
    const approvedDependents = dependentSubjects.filter(id => subjectData[id]?.completed);
    
    approvedDependents.forEach(depId => {
        unapproveSubjectRecursive(depId);
    });
    
    // Desaprobar esta materia
    subject.completed = false;
    completedSubjects.delete(subjectId);
}

// Actualizar barra de progreso
function updateProgress() {
    const totalSubjects = Object.keys(subjectData).length;
    const completedCount = completedSubjects.size;
    const percentage = totalSubjects > 0 ? (completedCount / totalSubjects) * 100 : 0;
    
    const progressFill = document.getElementById('progressFill');
    const completedCountElement = document.getElementById('completedCount');
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    
    if (completedCountElement) {
        completedCountElement.textContent = completedCount;
    }
    
    // Confetti cuando se completa todo
    if (completedCount === totalSubjects && totalSubjects > 0) {
        setTimeout(() => {
            showCongratulations();
        }, 500);
    }
}

// Mostrar felicitaciones
function showCongratulations() {
    alert('🎉 ¡Felicitaciones! 🎉\n\n¡Has completado toda la malla curricular de Ingeniería de Sistemas!\n\n¡Eres todo un profesional!');
}

// Guardar progreso en localStorage
function saveProgress() {
    const progress = {
        completedSubjects: Array.from(completedSubjects),
        timestamp: new Date().toISOString()
    };
    
    try {
        localStorage.setItem('mallaProgress', JSON.stringify(progress));
    } catch (e) {
        console.warn('No se pudo guardar el progreso:', e);
    }
}

// Cargar progreso desde localStorage
function loadProgress() {
    try {
        const saved = localStorage.getItem('mallaProgress');
        if (saved) {
            const progress = JSON.parse(saved);
            
            if (progress.completedSubjects) {
                progress.completedSubjects.forEach(subjectId => {
                    if (subjectData[subjectId]) {
                        subjectData[subjectId].completed = true;
                        completedSubjects.add(subjectId);
                    }
                });
                
                updateSubjectStates();
                updateProgress();
            }
        }
    } catch (e) {
        console.warn('No se pudo cargar el progreso:', e);
    }
}

// Resetear progreso
function resetProgress() {
    const confirm_reset = confirm('¿Estás seguro de que quieres resetear todo tu progreso?');
    
    if (confirm_reset) {
        completedSubjects.clear();
        
        Object.keys(subjectData).forEach(subjectId => {
            subjectData[subjectId].completed = false;
        });
        
        updateSubjectStates();
        updateProgress();
        saveProgress();
        
        alert('Progreso reseteado correctamente.');
    }
}

// Exportar progreso
function exportProgress() {
    const progress = {
        completedSubjects: Array.from(completedSubjects),
        completedNames: Array.from(completedSubjects).map(id => {
            const subject = subjectData[id];
            return subject ? subject.element.querySelector('.subject-name').textContent : id;
        }),
        totalSubjects: Object.keys(subjectData).length,
        completionPercentage: Math.round((completedSubjects.size / Object.keys(subjectData).length) * 100),
        exportDate: new Date().toLocaleDateString('es-ES')
    };
    
    const dataStr = JSON.stringify(progress, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `malla_progreso_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Agregar atajos de teclado
document.addEventListener('keydown', function(e) {
    // Ctrl + R para resetear
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        resetProgress();
    }
    
    // Ctrl + E para exportar
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        exportProgress();
    }
});

// Crear menú contextual
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    
    // Remover menú existente
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Crear nuevo menú
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = `
        position: fixed;
        top: ${e.clientY}px;
        left: ${e.clientX}px;
        background: white;
        border: 2px solid #a855f7;
        border-radius: 8px;
        padding: 10px 0;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 1000;
        min-width: 200px;
    `;
    
    const menuItems = [
        { text: 'Resetear Progreso', action: resetProgress },
        { text: 'Exportar Progreso', action: exportProgress }
    ];
    
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.textContent = item.text;
        menuItem.style.cssText = `
            padding: 10px 20px;
            cursor: pointer;
            transition: background 0.2s;
        `;
        
        menuItem.addEventListener('mouseenter', () => {
            menuItem.style.background = '#f3f4f6';
        });
        
        menuItem.addEventListener('mouseleave', () => {
            menuItem.style.background = 'transparent';
        });
        
        menuItem.addEventListener('click', () => {
            item.action();
            menu.remove();
        });
        
        menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    
    // Remover menú al hacer click fuera
    setTimeout(() => {
        document.addEventListener('click', function removeMenu() {
            menu.remove();
            document.removeEventListener('click', removeMenu);
        });
    }, 10);
});
