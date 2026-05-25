// FamilyLocalTree - Main Application (Materialize CSS)

class FamilyTreeApp {
    constructor() {
        this.zoom = 1;
        this.selectedPerson = null;
        this.currentFilters = {};
        this.currentDetailsPersonId = null;
        
        this.init();
    }

    init() {
        M.AutoInit();
        
        document.querySelectorAll('select').forEach(el => {
            M.FormSelect.init(el);
        });
        
        document.querySelectorAll('.modal').forEach(el => {
            M.Modal.init(el, {
                dismissible: true,
                onCloseEnd: () => {
                    if (el.id === 'person-modal') {
                        document.getElementById('person-form').reset();
                    }
                }
            });
        });
        
        this.bindEvents();
        this.updateCityFilter();
        this.updateLineFilter();
        this.updateStats();
        this.renderTree();
    }

    bindEvents() {
        // Navigation
        document.getElementById('nav-add-person').addEventListener('click', (e) => {
            e.preventDefault();
            this.openAddPersonModal();
        });
        document.getElementById('nav-export').addEventListener('click', (e) => {
            e.preventDefault();
            this.exportData();
        });
        document.getElementById('nav-import').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('import-file').click();
        });
        document.getElementById('import-file').addEventListener('change', (e) => this.importData(e));
        
        // Filters
        document.getElementById('apply-filters').addEventListener('click', () => this.applyFilters());
        document.getElementById('clear-filters').addEventListener('click', () => this.clearFilters());
        
        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('reset-view').addEventListener('click', () => this.resetView());
        
        // Modal actions
        document.getElementById('save-person').addEventListener('click', (e) => this.savePerson(e));
        document.getElementById('add-relation').addEventListener('click', () => this.addRelationField());
        document.getElementById('delete-person').addEventListener('click', () => this.deletePerson());
        document.getElementById('edit-person').addEventListener('click', () => {
            this.closeDetailsModal();
            this.openEditPersonModal(this.currentDetailsPersonId);
        });
        
        // Auto patronymic
        document.getElementById('auto-patronymic').addEventListener('click', (e) => {
            e.preventDefault();
            this.fillPatronymicFromParent();
        });
    }


    // Render tree
    renderTree() {
        const canvas = document.getElementById('tree-canvas');
        const people = this.currentFilters.city || this.currentFilters.yearFrom || 
                       this.currentFilters.yearTo || this.currentFilters.relation || this.currentFilters.line
            ? familyData.filterPeople(this.currentFilters)
            : familyData.getAllPeople();
        
        if (people.length === 0) {
            canvas.innerHTML = `
                <div class="empty-state">
                    <i class="material-icons">account_tree</i>
                    <h2>Дерево пустое</h2>
                    <p>Добавьте первого человека, чтобы начать</p>
                    <button class="btn waves-effect waves-light green" onclick="app.openAddPersonModal()">
                        <i class="material-icons left">person_add</i>Добавить человека
                    </button>
                </div>
            `;
            return;
        }
        
        // Build hierarchical tree
        const tree = this.buildTreeHierarchy(people);
        canvas.innerHTML = this.renderTreeLevel(tree);
        
        // Bind click events
        canvas.querySelectorAll('.node-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                this.showPersonDetails(id);
            });
        });
    }

    buildTreeHierarchy(people) {
        const relations = familyData.getAllRelations();
        const peopleMap = new Map(people.map(p => [p.id, { ...p, children: [] }]));
        
        // Build parent-child relationships
        relations.filter(r => r.type === 'parent').forEach(r => {
            const parent = peopleMap.get(r.from);
            const child = peopleMap.get(r.to);
            if (parent && child) {
                parent.children.push(child);
            }
        });
        
        // Find roots (people who are not children of anyone in the filtered set)
        const childIds = new Set();
        relations.filter(r => r.type === 'parent').forEach(r => {
            childIds.add(r.to);
        });
        
        const roots = [];
        peopleMap.forEach(person => {
            if (!childIds.has(person.id)) {
                roots.push(person);
            }
        });
        
        // If no roots, use first person
        if (roots.length === 0 && peopleMap.size > 0) {
            roots.push(peopleMap.values().next().value);
        }
        
        return roots;
    }

    renderTreeLevel(nodes, level = 0) {
        if (!nodes || nodes.length === 0) return '';
        
        const html = nodes.map(node => {
            const person = familyData.getPerson(node.id);
            if (!person) return '';
            
            const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : '?';
            const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
            const dateStr = deathYear ? `${birthYear} — ${deathYear}` : `${birthYear} — н.в.`;
            
            // Format name with patronymic
            const fullName = `${person.name}${person.patronymic ? ' ' + person.patronymic : ''} ${person.surname || ''}`.trim();
            
            return `
                <div class="tree-node" data-id="${node.id}">
                    <div class="node-card ${this.selectedPerson === node.id ? 'selected' : ''}" 
                         data-id="${node.id}">
                        ${person.photo 
                            ? `<img src="${person.photo}" class="node-photo" alt="${person.name}">`
                            : `<div class="node-photo-placeholder">${person.name[0]}</div>`
                        }
                        <div class="node-name">${fullName}</div>
                        <div class="node-dates">${dateStr}</div>
                        ${person.city ? `<div class="node-city"><i class="material-icons tiny">location_on</i>${person.city}</div>` : ''}
                    </div>
                    ${node.children.length > 0 ? 
                        `<div class="tree-level">${this.renderTreeLevel(node.children, level + 1)}</div>` 
                        : ''
                    }
                </div>
            `;
        }).join('');
        
        return `<div class="tree-level">${html}</div>`;
    }

    // Filters
    updateCityFilter() {
        const select = document.getElementById('filter-city');
        const cities = familyData.getCities();
        
        const instance = M.FormSelect.getInstance(select);
        if (instance) instance.destroy();
        
        select.innerHTML = '<option value="" disabled selected>Все города</option>';
        cities.forEach(city => {
            select.innerHTML += `<option value="${city}">${city}</option>`;
        });
        
        M.FormSelect.init(select);
    }

    updateLineFilter() {
        const select = document.getElementById('filter-line');
        const people = familyData.getAllPeople();
        
        const instance = M.FormSelect.getInstance(select);
        if (instance) instance.destroy();
        
        select.innerHTML = '<option value="" disabled selected>Все линии</option>';
        people.forEach(p => {
            const fullName = `${p.name}${p.patronymic ? ' ' + p.patronymic : ''} ${p.surname || ''}`.trim();
            select.innerHTML += `<option value="${p.id}">${fullName}</option>`;
        });
        
        M.FormSelect.init(select);
    }

    applyFilters() {
        const citySelect = document.getElementById('filter-city');
        const cityInstance = M.FormSelect.getInstance(citySelect);
        
        const lineSelect = document.getElementById('filter-line');
        const lineInstance = M.FormSelect.getInstance(lineSelect);
        
        this.currentFilters = {
            city: cityInstance ? cityInstance.getSelectedValues().join('') : '',
            yearFrom: document.getElementById('filter-year-from').value,
            yearTo: document.getElementById('filter-year-to').value,
            relation: document.getElementById('filter-relation').value,
            line: lineInstance ? lineInstance.getSelectedValues().join('') : ''
        };
        this.renderTree();
    }

    clearFilters() {
        document.getElementById('filter-year-from').value = '';
        document.getElementById('filter-year-to').value = '';
        
        ['filter-city', 'filter-relation', 'filter-line'].forEach(id => {
            const select = document.getElementById(id);
            const instance = M.FormSelect.getInstance(select);
            if (instance) instance.destroy();
            select.value = '';
            M.FormSelect.init(select);
        });
        
        this.currentFilters = {};
        this.renderTree();
    }

    // Stats
    updateStats() {
        document.getElementById('stat-people').textContent = familyData.getAllPeople().length;
        document.getElementById('stat-cities').textContent = familyData.getCities().length;
        document.getElementById('stat-relations').textContent = familyData.getAllRelations().length;
    }

    // Zoom
    zoomIn() {
        this.zoom = Math.min(this.zoom + 0.1, 2);
        this.updateZoom();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom - 0.1, 0.5);
        this.updateZoom();
    }

    resetView() {
        this.zoom = 1;
        this.updateZoom();
    }

    updateZoom() {
        document.getElementById('tree-canvas').style.transform = `scale(${this.zoom})`;
        document.getElementById('zoom-level').textContent = `${Math.round(this.zoom * 100)}%`;
    }

    // Auto fill patronymic from parent
    fillPatronymicFromParent() {
        const personId = document.getElementById('person-id').value;
        const patronymicField = document.getElementById('person-patronymic');
        
        // If editing existing person
        if (personId) {
            const generated = familyData.generatePatronymic(personId);
            if (generated) {
                patronymicField.value = generated;
                M.toast({html: 'Отчество: ' + generated, classes: 'blue'});
            } else {
                M.toast({html: 'Не найден родитель', classes: 'orange'});
            }
        } else {
            // For new person - check if there's a parent relation already added
            const relationRows = document.querySelectorAll('.relation-row');
            let parentFound = false;
            
            relationRows.forEach(row => {
                const typeSelect = row.querySelector('.relation-type-select');
                const typeInstance = M.FormSelect.getInstance(typeSelect);
                const type = typeInstance ? typeInstance.getSelectedValues().join('') : typeSelect.value;
                
                if (type === 'parent') {
                    const personSelect = row.querySelector('.relation-person-select');
                    const personInstance = M.FormSelect.getInstance(personSelect);
                    const parentId = personInstance ? personInstance.getSelectedValues().join('') : personSelect.value;
                    
                    if (parentId) {
                        const parent = familyData.getPerson(parentId);
                        if (parent && parent.name) {
                            let root = parent.name;
                            if (root.endsWith('а')) root = root.slice(0, -1);
                            if (root.endsWith('й')) root = root.slice(0, -1) + 'й';
                            patronymicField.value = root + 'ович';
                            M.toast({html: 'Отчество: ' + patronymicField.value, classes: 'blue'});
                            parentFound = true;
                        }
                    }
                }
            });
            
            if (!parentFound) {
                M.toast({html: 'Сначала добавьте связь с родителем', classes: 'orange'});
            }
        }
    }

    // Modal
    openAddPersonModal() {
        document.getElementById('modal-title').innerHTML = '<i class="material-icons">person_add</i> Добавить человека';
        document.getElementById('person-form').reset();
        document.getElementById('person-id').value = '';
        document.getElementById('delete-person').style.display = 'none';
        document.getElementById('relations-container').innerHTML = '';
        
        const modal = M.Modal.getInstance(document.getElementById('person-modal'));
        modal.open();
    }

    openEditPersonModal(personId) {
        const person = familyData.getPerson(personId);
        if (!person) return;
        
        document.getElementById('modal-title').innerHTML = '<i class="material-icons">edit</i> Редактировать';
        document.getElementById('person-id').value = person.id;
        document.getElementById('person-name').value = person.name;
        document.getElementById('person-surname').value = person.surname || '';
        document.getElementById('person-patronymic').value = person.patronymic || '';
        document.getElementById('person-birth-date').value = person.birthDate || '';
        document.getElementById('person-death-date').value = person.deathDate || '';
        document.getElementById('person-death-place').value = person.deathPlace || '';
        document.getElementById('person-city').value = person.city || '';
        document.getElementById('person-photo').value = person.photo || '';
        document.getElementById('person-notes').value = person.notes || '';
        
        document.getElementById('delete-person').style.display = 'inline-flex';
        
        // Load existing relations
        const relations = familyData.getRelationsForPerson(personId);
        const container = document.getElementById('relations-container');
        container.innerHTML = '';
        
        relations.forEach(rel => {
            const relatedId = rel.from === personId ? rel.to : rel.from;
            this.addRelationField(rel.type, relatedId);
        });
        
        const modal = M.Modal.getInstance(document.getElementById('person-modal'));
        modal.open();
    }

    addRelationField(type = '', relatedId = '') {
        const container = document.getElementById('relations-container');
        const people = familyData.getAllPeople();
        const currentId = document.getElementById('person-id').value;
        
        const filteredPeople = people.filter(p => p.id !== currentId);
        
        let options = '<option value="" disabled selected>Выберите</option>';
        filteredPeople.forEach(p => {
            const fullName = `${p.name}${p.patronymic ? ' ' + p.patronymic : ''} ${p.surname || ''}`.trim();
            options += `<option value="${p.id}" ${p.id === relatedId ? 'selected' : ''}>${fullName}</option>`;
        });
        
        const html = `
            <div class="relation-row">
                <div class="input-field">
                    <select class="relation-type-select">
                        <option value="parent" ${type === 'parent' ? 'selected' : ''}>Родитель</option>
                        <option value="child" ${type === 'child' ? 'selected' : ''}>Ребёнок</option>
                        <option value="spouse" ${type === 'spouse' ? 'selected' : ''}>Супруг(а)</option>
                        <option value="sibling" ${type === 'sibling' ? 'selected' : ''}>Брат/сестра</option>
                    </select>
                </div>
                <div class="input-field">
                    <select class="relation-person-select">
                        ${options}
                    </select>
                </div>
                <button type="button" class="remove-relation" onclick="this.closest('.relation-row').remove()">
                    <i class="material-icons">close</i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', html);
        
        // Initialize new selects
        container.querySelectorAll('select').forEach(el => {
            if (!M.FormSelect.getInstance(el)) {
                M.FormSelect.init(el);
            }
        });
    }

    savePerson(e) {
        e.preventDefault();
        
        const id = document.getElementById('person-id').value;
        const personData = {
            name: document.getElementById('person-name').value,
            surname: document.getElementById('person-surname').value,
            patronymic: document.getElementById('person-patronymic').value,
            birthDate: document.getElementById('person-birth-date').value,
            deathDate: document.getElementById('person-death-date').value,
            deathPlace: document.getElementById('person-death-place').value,
            city: document.getElementById('person-city').value,
            photo: document.getElementById('person-photo').value,
            notes: document.getElementById('person-notes').value
        };
        
        if (!personData.name) {
            M.toast({html: 'Имя обязательно!', classes: 'red'});
            return;
        }
        
        let personId = id;
        
        if (id) {
            familyData.updatePerson(id, personData);
            M.toast({html: 'Данные обновлены!', classes: 'green'});
        } else {
            const newPerson = familyData.addPerson(personData);
            personId = newPerson.id;
            M.toast({html: 'Человек добавлен!', classes: 'green'});
        }
        
        // Save relations
        const relationRows = document.querySelectorAll('.relation-row');
        const existingRelations = familyData.getRelationsForPerson(personId);
        existingRelations.forEach(r => familyData.removeRelation(r.from, r.to));
        
        relationRows.forEach(row => {
            const typeSelect = row.querySelector('.relation-type-select');
            const personSelect = row.querySelector('.relation-person-select');
            
            const typeInstance = M.FormSelect.getInstance(typeSelect);
            const personInstance = M.FormSelect.getInstance(personSelect);
            
            const type = typeInstance ? typeInstance.getSelectedValues().join('') : typeSelect.value;
            const relatedId = personInstance ? personInstance.getSelectedValues().join('') : personSelect.value;
            
            if (relatedId) {
                familyData.addRelation(personId, relatedId, type);
            }
        });
        
        const modal = M.Modal.getInstance(document.getElementById('person-modal'));
        modal.close();
        
        this.updateCityFilter();
        this.updateLineFilter();
        this.updateStats();
        this.renderTree();
    }

    deletePerson() {
        const id = document.getElementById('person-id').value;
        if (confirm('Вы уверены, что хотите удалить этого человека?')) {
            familyData.deletePerson(id);
            M.toast({html: 'Человек удалён', classes: 'red'});
            
            const modal = M.Modal.getInstance(document.getElementById('person-modal'));
            modal.close();
            
            this.updateCityFilter();
            this.updateLineFilter();
            this.updateStats();
            this.renderTree();
        }
    }

    showPersonDetails(id) {
        this.currentDetailsPersonId = id;
        const person = familyData.getPerson(id);
        if (!person) return;
        
        const related = familyData.getRelatedPeople(id);
        
        const getRelationLabel = (type, fromId) => {
            if (type === 'parent') return fromId === id ? 'Родитель' : 'Ребёнок';
            if (type === 'spouse') return 'Супруг(а)';
            if (type === 'sibling') return 'Брат/сестра';
            return type;
        };
        
        const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : '?';
        const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
        const dateStr = deathYear ? `${birthYear} — ${deathYear}` : `${birthYear} — н.в.`;
        
        const fullName = `${person.name}${person.patronymic ? ' ' + person.patronymic : ''} ${person.surname || ''}`.trim();
        
        document.getElementById('person-details').innerHTML = `
            <div class="person-details-header">
                ${person.photo 
                    ? `<img src="${person.photo}" class="person-details-photo" alt="${person.name}">`
                    : `<div class="node-photo-placeholder" style="width:120px;height:120px;font-size:3rem;">${person.name[0]}</div>`
                }
                <div class="person-details-info">
                    <h2>${fullName}</h2>
                    <div class="dates">${dateStr}</div>
                    ${person.city ? `<div class="city"><i class="material-icons tiny">location_on</i>${person.city}</div>` : ''}
                    ${person.deathPlace ? `<div class="city"><i class="material-icons tiny">flag</i>${person.deathPlace}</div>` : ''}
                </div>
            </div>
            
            ${person.notes ? `
                <div class="person-details-section">
                    <h3><i class="material-icons">notes</i> Заметки</h3>
                    <p>${person.notes}</p>
                </div>
            ` : ''}
            
            <div class="person-details-section">
                <h3><i class="material-icons">people</i> Связи (${related.length})</h3>
                <div class="relation-list">
                    ${related.length > 0 ? related.map(p => {
                        const pFullName = `${p.name}${p.patronymic ? ' ' + p.patronymic : ''} ${p.surname || ''}`.trim();
                        return `
                        <div class="relation-item" onclick="app.showPersonDetails('${p.id}')">
                            <span class="relation-type">${getRelationLabel(p.relationType, p.relationFrom)}</span>
                            <strong>${pFullName}</strong>
                            ${p.city ? `<span><i class="material-icons tiny">location_on</i>${p.city}</span>` : ''}
                        </div>
                    `}).join('') : '<p>Нет связей</p>'}
                </div>
            </div>
        `;
        
        const modal = M.Modal.getInstance(document.getElementById('details-modal'));
        modal.open();
    }

    closeDetailsModal() {
        const modal = M.Modal.getInstance(document.getElementById('details-modal'));
        modal.close();
    }

    // Export/Import
    exportData() {
        const data = familyData.exportToJSON();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'family-tree.json';
        a.click();
        URL.revokeObjectURL(url);
        M.toast({html: 'Данные экспортированы!', classes: 'green'});
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            if (familyData.importFromJSON(event.target.result)) {
                this.updateCityFilter();
                this.updateLineFilter();
                this.updateStats();
                this.renderTree();
                M.toast({html: 'Данные импортированы!', classes: 'green'});
            } else {
                M.toast({html: 'Ошибка импорта данных', classes: 'red'});
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FamilyTreeApp();
});