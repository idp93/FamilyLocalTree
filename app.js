// FamilyLocalTree - Main Application

class FamilyTreeApp {
    constructor() {
        this.zoom = 1;
        this.selectedPerson = null;
        this.currentFilters = {};
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateCityFilter();
        this.renderTree();
    }

    bindEvents() {
        // Filters
        document.getElementById('apply-filters').addEventListener('click', () => this.applyFilters());
        document.getElementById('clear-filters').addEventListener('click', () => this.clearFilters());
        
        // Actions
        document.getElementById('add-person').addEventListener('click', () => this.openAddPersonModal());
        document.getElementById('export-data').addEventListener('click', () => this.exportData());
        document.getElementById('import-data').addEventListener('click', () => document.getElementById('import-file').click());
        document.getElementById('import-file').addEventListener('change', (e) => this.importData(e));
        
        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('reset-view').addEventListener('click', () => this.resetView());
        
        // Modal
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });
        
        document.getElementById('person-form').addEventListener('submit', (e) => this.savePerson(e));
        document.getElementById('add-relation').addEventListener('click', () => this.addRelationField());
        document.getElementById('delete-person').addEventListener('click', () => this.deletePerson());
        
        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }

    // Render tree
    renderTree() {
        const canvas = document.getElementById('tree-canvas');
        const people = this.currentFilters.city || this.currentFilters.yearFrom || 
                       this.currentFilters.yearTo || this.currentFilters.relation
            ? familyData.filterPeople(this.currentFilters)
            : familyData.getAllPeople();
        
        if (people.length === 0) {
            canvas.innerHTML = `
                <div class="empty-state">
                    <h2>Дерево пустое</h2>
                    <p>Добавьте первого человека, чтобы начать</p>
                    <button class="btn btn-success" onclick="app.openAddPersonModal()">+ Добавить человека</button>
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
        
        // Find roots
        const roots = [];
        peopleMap.forEach(person => {
            const isChild = relations.some(r => r.type === 'parent' && r.to === person.id);
            if (!isChild) {
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
            
            return `
                <div class="tree-node">
                    <div class="node-card ${this.selectedPerson === node.id ? 'selected' : ''}" 
                         data-id="${node.id}">
                        ${person.photo 
                            ? `<img src="${person.photo}" class="node-photo" alt="${person.name}">`
                            : `<div class="node-photo-placeholder">${person.name[0]}</div>`
                        }
                        <div class="node-name">${person.name} ${person.surname || ''}</div>
                        <div class="node-dates">${this.formatDate(person.birthDate)} — ${person.deathDate ? this.formatDate(person.deathDate) : 'н.в.'}</div>
                        ${person.city ? `<div class="node-city">📍 ${person.city}</div>` : ''}
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

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: 'numeric' });
    }

    // Filters
    updateCityFilter() {
        const select = document.getElementById('filter-city');
        const cities = familyData.getCities();
        
        select.innerHTML = '<option value="">Все города</option>';
        cities.forEach(city => {
            select.innerHTML += `<option value="${city}">${city}</option>`;
        });
    }

    applyFilters() {
        this.currentFilters = {
            city: document.getElementById('filter-city').value,
            yearFrom: document.getElementById('filter-year-from').value,
            yearTo: document.getElementById('filter-year-to').value,
            relation: document.getElementById('filter-relation').value
        };
        this.renderTree();
    }

    clearFilters() {
        document.getElementById('filter-city').value = '';
        document.getElementById('filter-year-from').value = '';
        document.getElementById('filter-year-to').value = '';
        document.getElementById('filter-relation').value = '';
        this.currentFilters = {};
        this.renderTree();
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

    // Modal
    openAddPersonModal() {
        document.getElementById('modal-title').textContent = 'Добавить человека';
        document.getElementById('person-form').reset();
        document.getElementById('person-id').value = '';
        document.getElementById('delete-person').style.display = 'none';
        document.getElementById('relations-container').innerHTML = '';
        this.populateRelationSelect();
        document.getElementById('person-modal').style.display = 'block';
    }

    openEditPersonModal(personId) {
        const person = familyData.getPerson(personId);
        if (!person) return;
        
        document.getElementById('modal-title').textContent = 'Редактировать';
        document.getElementById('person-id').value = person.id;
        document.getElementById('person-name').value = person.name;
        document.getElementById('person-surname').value = person.surname || '';
        document.getElementById('person-birth-date').value = person.birthDate || '';
        document.getElementById('person-death-date').value = person.deathDate || '';
        document.getElementById('person-city').value = person.city || '';
        document.getElementById('person-photo').value = person.photo || '';
        document.getElementById('person-notes').value = person.notes || '';
        
        document.getElementById('delete-person').style.display = 'block';
        
        // Load existing relations
        this.populateRelationSelect();
        const relations = familyData.getRelationsForPerson(personId);
        const container = document.getElementById('relations-container');
        container.innerHTML = '';
        
        relations.forEach(rel => {
            const relatedId = rel.from === personId ? rel.to : rel.from;
            this.addRelationField(rel.type, relatedId);
        });
        
        document.getElementById('person-modal').style.display = 'block';
    }

    populateRelationSelect() {
        // Will be populated dynamically when modal opens
    }

    addRelationField(type = '', relatedId = '') {
        const container = document.getElementById('relations-container');
        const people = familyData.getAllPeople();
        const currentId = document.getElementById('person-id').value;
        
        const filteredPeople = people.filter(p => p.id !== currentId);
        
        let options = filteredPeople.map(p => 
            `<option value="${p.id}" ${p.id === relatedId ? 'selected' : ''}>${p.name} ${p.surname || ''}</option>`
        ).join('');
        
        const html = `
            <div class="relation-row">
                <select class="relation-type-select">
                    <option value="parent" ${type === 'parent' ? 'selected' : ''}>Родитель</option>
                    <option value="child" ${type === 'child' ? 'selected' : ''}>Ребёнок</option>
                    <option value="spouse" ${type === 'spouse' ? 'selected' : ''}>Супруг(а)</option>
                    <option value="sibling" ${type === 'sibling' ? 'selected' : ''}>Брат/сестра</option>
                </select>
                <select class="relation-person-select">
                    ${options}
                </select>
                <button type="button" class="remove-relation" onclick="this.parentElement.remove()">×</button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', html);
    }

    savePerson(e) {
        e.preventDefault();
        
        const id = document.getElementById('person-id').value;
        const personData = {
            name: document.getElementById('person-name').value,
            surname: document.getElementById('person-surname').value,
            birthDate: document.getElementById('person-birth-date').value,
            deathDate: document.getElementById('person-death-date').value,
            city: document.getElementById('person-city').value,
            photo: document.getElementById('person-photo').value,
            notes: document.getElementById('person-notes').value
        };
        
        let personId = id;
        
        if (id) {
            familyData.updatePerson(id, personData);
        } else {
            const newPerson = familyData.addPerson(personData);
            personId = newPerson.id;
        }
        
        // Save relations
        const relationRows = document.querySelectorAll('.relation-row');
        const existingRelations = familyData.getRelationsForPerson(personId);
        existingRelations.forEach(r => familyData.removeRelation(r.from, r.to));
        
        relationRows.forEach(row => {
            const type = row.querySelector('.relation-type-select').value;
            const relatedId = row.querySelector('.relation-person-select').value;
            if (relatedId) {
                familyData.addRelation(personId, relatedId, type);
            }
        });
        
        this.closeModals();
        this.updateCityFilter();
        this.renderTree();
    }

    deletePerson() {
        const id = document.getElementById('person-id').value;
        if (confirm('Вы уверены, что хотите удалить этого человека?')) {
            familyData.deletePerson(id);
            this.closeModals();
            this.updateCityFilter();
            this.renderTree();
        }
    }

    showPersonDetails(id) {
        const person = familyData.getPerson(id);
        if (!person) return;
        
        const related = familyData.getRelatedPeople(id);
        
        const getRelationLabel = (type, fromId) => {
            if (type === 'parent') return fromId === id ? 'Родитель' : 'Ребёнок';
            if (type === 'spouse') return 'Супруг(а)';
            if (type === 'sibling') return 'Брат/сестра';
            return type;
        };
        
        document.getElementById('person-details').innerHTML = `
            <div class="person-details-header">
                ${person.photo 
                    ? `<img src="${person.photo}" class="person-details-photo" alt="${person.name}">`
                    : `<div class="node-photo-placeholder" style="width:120px;height:120px;font-size:3rem;">${person.name[0]}</div>`
                }
                <div class="person-details-info">
                    <h2>${person.name} ${person.surname || ''}</h2>
                    <div class="dates">${this.formatDate(person.birthDate)} — ${person.deathDate ? this.formatDate(person.deathDate) : 'н.в.'}</div>
                    ${person.city ? `<div class="city">📍 ${person.city}</div>` : ''}
                </div>
            </div>
            
            ${person.notes ? `
                <div class="person-details-section">
                    <h3>Заметки</h3>
                    <p>${person.notes}</p>
                </div>
            ` : ''}
            
            <div class="person-details-section">
                <h3>Связи</h3>
                <div class="relation-list">
                    ${related.length > 0 ? related.map(p => `
                        <div class="relation-item" onclick="app.showPersonDetails('${p.id}')">
                            <span class="relation-type">${getRelationLabel(p.relationType, p.relationFrom)}</span>
                            <strong>${p.name} ${p.surname || ''}</strong>
                            ${p.city ? `<span>📍 ${p.city}</span>` : ''}
                        </div>
                    `).join('') : '<p>Нет связей</p>'}
                </div>
            </div>
            
            <div class="form-actions" style="margin-top:1.5rem;">
                <button class="btn btn-primary" onclick="app.openEditPersonModal('${id}')">Редактировать</button>
            </div>
        `;
        
        document.getElementById('details-modal').style.display = 'block';
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
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
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            if (familyData.importFromJSON(event.target.result)) {
                this.updateCityFilter();
                this.renderTree();
                alert('Данные успешно импортированы!');
            } else {
                alert('Ошибка импорта данных');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }
}

// Initialize app
const app = new FamilyTreeApp();