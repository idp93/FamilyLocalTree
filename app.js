// FamilyLocalTree - Main Application (Materialize CSS)

class FamilyTreeApp {
    constructor() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
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

        document.getElementById('apply-filters').addEventListener('click', () => this.applyFilters());
        document.getElementById('clear-filters').addEventListener('click', () => this.clearFilters());

        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('reset-view').addEventListener('click', () => this.resetView());

        document.getElementById('save-person').addEventListener('click', (e) => this.savePerson(e));
        document.getElementById('add-relation').addEventListener('click', () => this.addRelationField());
        document.getElementById('delete-person').addEventListener('click', () => this.deletePerson());
        document.getElementById('edit-person').addEventListener('click', () => {
            this.closeDetailsModal();
            this.openEditPersonModal(this.currentDetailsPersonId);
        });

        document.getElementById('auto-patronymic').addEventListener('click', (e) => {
            e.preventDefault();
            this.fillPatronymicFromParent();
        });

        // Drag-to-pan полотна
        const treeView = document.getElementById('tree-view');
        treeView.addEventListener('mousedown', (e) => {
            if (e.target.closest('.node-card')) return;
            this.isPanning = true;
            this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
            treeView.style.cursor = 'grabbing';
        });
        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return;
            this.panX = e.clientX - this.panStart.x;
            this.panY = e.clientY - this.panStart.y;
            this.updateTransform();
        });
        window.addEventListener('mouseup', () => {
            this.isPanning = false;
            treeView.style.cursor = 'grab';
        });

        // Zoom колёсиком мыши
        treeView.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.zoom = Math.min(Math.max(this.zoom + delta, 0.3), 2.5);
            this.updateZoom();
        }, { passive: false });
    }

    // ─── РЕНДЕР ДЕРЕВА ───────────────────────────────────────────────────────

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

        const layout = this.computeLayout(people);
        this.drawTree(canvas, layout, people);
    }

    // ─── ВЫЧИСЛЕНИЕ ПОЗИЦИЙ ───────────────────────────────────────────────────

    computeLayout(people) {
        const NODE_W = 200;
        const NODE_H = 160;
        const H_GAP = 40;   // горизонтальный отступ между узлами
        const V_GAP = 100;  // вертикальный отступ между уровнями

        const peopleSet = new Set(people.map(p => p.id));
        const relations = familyData.getAllRelations().filter(
            r => peopleSet.has(r.from) && peopleSet.has(r.to)
        );

        // Строим карту: ребёнок → [родители]
        // Соглашение в данных: { from: parent_id, to: child_id, type: 'parent' }
        const childrenOf = new Map(); // parent_id → [child_id]
        const parentsOf = new Map();  // child_id  → [parent_id]

        relations.filter(r => r.type === 'parent').forEach(r => {
            if (!childrenOf.has(r.from)) childrenOf.set(r.from, []);
            childrenOf.get(r.from).push(r.to);

            if (!parentsOf.has(r.to)) parentsOf.set(r.to, []);
            parentsOf.get(r.to).push(r.from);
        });

        // Карта супругов
        const spouseOf = new Map();
        relations.filter(r => r.type === 'spouse').forEach(r => {
            if (!spouseOf.has(r.from)) spouseOf.set(r.from, []);
            spouseOf.get(r.from).push(r.to);
            if (!spouseOf.has(r.to)) spouseOf.set(r.to, []);
            spouseOf.get(r.to).push(r.from);
        });

        // Назначаем уровни через BFS от корней
        const levelOf = new Map();
        const allChildIds = new Set(parentsOf.keys());
        const roots = people.filter(p => !allChildIds.has(p.id));

        // BFS
        const queue = [];
        roots.forEach(r => { levelOf.set(r.id, 0); queue.push(r.id); });
        if (queue.length === 0 && people.length > 0) {
            levelOf.set(people[0].id, 0);
            queue.push(people[0].id);
        }

        let head = 0;
        while (head < queue.length) {
            const pid = queue[head++];
            const currentLevel = levelOf.get(pid);
            const children = childrenOf.get(pid) || [];
            children.forEach(cid => {
                if (!levelOf.has(cid)) {
                    levelOf.set(cid, currentLevel + 1);
                    queue.push(cid);
                }
            });
        }
        // Оставшиеся без уровня
        people.forEach(p => {
            if (!levelOf.has(p.id)) levelOf.set(p.id, 0);
        });

        // Группируем по уровням
        const maxLevel = Math.max(...levelOf.values());
        const levels = [];
        for (let i = 0; i <= maxLevel; i++) levels.push([]);
        people.forEach(p => levels[levelOf.get(p.id) || 0].push(p.id));

        // Рассчитываем X-позиции через post-order
        const posX = new Map();
        const posY = new Map();

        // Сначала ставим всех по уровням равномерно (грубый layout)
        levels.forEach((ids, lvl) => {
            const totalW = ids.length * NODE_W + (ids.length - 1) * H_GAP;
            ids.forEach((id, i) => {
                posX.set(id, i * (NODE_W + H_GAP) - totalW / 2 + NODE_W / 2);
                posY.set(id, lvl * (NODE_H + V_GAP));
            });
        });

        // Улучшаем: центрируем родителей над детьми (bottom-up)
        for (let lvl = maxLevel - 1; lvl >= 0; lvl--) {
            levels[lvl].forEach(id => {
                const children = childrenOf.get(id) || [];
                if (children.length > 0) {
                    const childXs = children.map(c => posX.get(c));
                    const midX = (Math.min(...childXs) + Math.max(...childXs)) / 2;
                    posX.set(id, midX);
                }
            });
        }

        // Смещаем супругов рядом друг с другом
        const paired = new Set();
        levels.forEach(ids => {
            ids.forEach(id => {
                if (paired.has(id)) return;
                const spouses = spouseOf.get(id) || [];
                const sameLevel = spouses.filter(s => levelOf.get(s) === levelOf.get(id));
                if (sameLevel.length > 0) {
                    const sp = sameLevel[0];
                    if (!paired.has(sp)) {
                        // Ставим супруга рядом
                        const myX = posX.get(id);
                        posX.set(sp, myX + NODE_W + H_GAP);
                        paired.add(id);
                        paired.add(sp);
                    }
                }
            });
        });

        // Нормализуем: сдвигаем все координаты чтобы начинались с 0
        const minX = Math.min(...posX.values()) - NODE_W / 2 - 40;
        const minY = Math.min(...posY.values()) - 40;
        posX.forEach((v, k) => posX.set(k, v - minX));
        posY.forEach((v, k) => posY.set(k, v - minY));

        const maxX = Math.max(...Array.from(posX.values()).map(x => x + NODE_W / 2)) + 40;
        const maxY = Math.max(...Array.from(posY.values()).map(y => y + NODE_H)) + 60;

        return { posX, posY, NODE_W, NODE_H, relations, spouseOf, childrenOf, parentsOf, width: maxX, height: maxY };
    }

    // ─── ОТРИСОВКА ───────────────────────────────────────────────────────────

    drawTree(canvas, layout, people) {
        const { posX, posY, NODE_W, NODE_H, relations, childrenOf, spouseOf, width, height } = layout;

        // SVG для линий
        let svgLines = `<svg class="tree-svg" width="${width}" height="${height}" style="position:absolute;top:0;left:0;pointer-events:none;">`;
        svgLines += `<defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#90A4AE"/>
            </marker>
        </defs>`;

        const drawn = new Set();

        // Линии родитель → ребёнок
        relations.filter(r => r.type === 'parent').forEach(r => {
            const px = posX.get(r.from);
            const py = posY.get(r.from);
            const cx = posX.get(r.to);
            const cy = posY.get(r.to);
            if (px === undefined || cx === undefined) return;

            const x1 = px + NODE_W / 2;
            const y1 = py + NODE_H;
            const x2 = cx + NODE_W / 2;
            const y2 = cy;
            const midY = (y1 + y2) / 2;

            svgLines += `<path d="M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}"
                fill="none" stroke="#1E88E5" stroke-width="2" stroke-opacity="0.7"/>`;
        });

        // Линии супруг ↔ супруг
        const spousePairs = new Set();
        relations.filter(r => r.type === 'spouse').forEach(r => {
            const key = [r.from, r.to].sort().join('-');
            if (spousePairs.has(key)) return;
            spousePairs.add(key);

            const ax = posX.get(r.from);
            const ay = posY.get(r.from);
            const bx = posX.get(r.to);
            const by = posY.get(r.to);
            if (ax === undefined || bx === undefined) return;

            const x1 = ax + NODE_W;
            const y1 = ay + NODE_H / 2;
            const x2 = bx;
            const y2 = by + NODE_H / 2;

            svgLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                stroke="#E91E63" stroke-width="2" stroke-dasharray="6,4" stroke-opacity="0.7"/>`;
            // Сердечко в центре
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            svgLines += `<text x="${mx}" y="${my + 5}" text-anchor="middle" font-size="14" fill="#E91E63">♥</text>`;
        });

        // Линии братья/сёстры
        const siblingPairs = new Set();
        relations.filter(r => r.type === 'sibling').forEach(r => {
            const key = [r.from, r.to].sort().join('-');
            if (siblingPairs.has(key)) return;
            siblingPairs.add(key);

            const ax = posX.get(r.from);
            const ay = posY.get(r.from);
            const bx = posX.get(r.to);
            const by = posY.get(r.to);
            if (ax === undefined || bx === undefined) return;

            const x1 = ax + NODE_W / 2;
            const y1 = ay + NODE_H / 2;
            const x2 = bx + NODE_W / 2;
            const y2 = by + NODE_H / 2;

            svgLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                stroke="#FF8F00" stroke-width="1.5" stroke-dasharray="4,3" stroke-opacity="0.6"/>`;
        });

        svgLines += '</svg>';

        // Карточки людей
        let cards = '';
        people.forEach(person => {
            const x = posX.get(person.id);
            const y = posY.get(person.id);
            if (x === undefined) return;

            const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : '?';
            const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
            const dateStr = deathYear ? `${birthYear} — ${deathYear}` : `${birthYear} — н.в.`;
            const fullName = `${person.name}${person.patronymic ? ' ' + person.patronymic : ''} ${person.surname || ''}`.trim();
            const isSelected = this.selectedPerson === person.id;
            const isDead = !!person.deathDate;

            cards += `
                <div class="node-card ${isSelected ? 'selected' : ''} ${isDead ? 'deceased' : ''}"
                     data-id="${person.id}"
                     style="position:absolute;left:${x}px;top:${y}px;width:${NODE_W}px;">
                    ${person.photo
                    ? `<img src="${person.photo}" class="node-photo" alt="${person.name}">`
                    : `<div class="node-photo-placeholder">${person.name[0]}</div>`
                }
                    <div class="node-name">${fullName}</div>
                    <div class="node-dates">${dateStr}</div>
                    ${person.city ? `<div class="node-city"><i class="material-icons tiny">location_on</i>${person.city}</div>` : ''}
                </div>
            `;
        });

        canvas.style.position = 'relative';
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.innerHTML = svgLines + cards;

        // События на карточках
        canvas.querySelectorAll('.node-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = card.dataset.id;
                this.selectedPerson = id;
                canvas.querySelectorAll('.node-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.showPersonDetails(id);
            });
        });
    }

    // ─── ФИЛЬТРЫ ─────────────────────────────────────────────────────────────

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

    // ─── СТАТИСТИКА ──────────────────────────────────────────────────────────

    updateStats() {
        document.getElementById('stat-people').textContent = familyData.getAllPeople().length;
        document.getElementById('stat-cities').textContent = familyData.getCities().length;
        document.getElementById('stat-relations').textContent = familyData.getAllRelations().length;
    }

    // ─── МАСШТАБ И ПАНОРАМИРОВАНИЕ ───────────────────────────────────────────

    zoomIn() {
        this.zoom = Math.min(this.zoom + 0.15, 2.5);
        this.updateZoom();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom - 0.15, 0.3);
        this.updateZoom();
    }

    resetView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateZoom();
        this.updateTransform();
    }

    updateZoom() {
        document.getElementById('zoom-level').textContent = `${Math.round(this.zoom * 100)}%`;
        this.updateTransform();
    }

    updateTransform() {
        const canvas = document.getElementById('tree-canvas');
        canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    }

    // ─── ОТЧЕСТВО ────────────────────────────────────────────────────────────

    fillPatronymicFromParent() {
        const personId = document.getElementById('person-id').value;
        const patronymicField = document.getElementById('person-patronymic');

        if (personId) {
            const generated = familyData.generatePatronymic(personId);
            if (generated) {
                patronymicField.value = generated;
                M.updateTextFields();
                M.toast({ html: 'Отчество: ' + generated, classes: 'blue' });
            } else {
                M.toast({ html: 'Не найден родитель', classes: 'orange' });
            }
        } else {
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
                            patronymicField.value = root + 'ович';
                            M.updateTextFields();
                            M.toast({ html: 'Отчество: ' + patronymicField.value, classes: 'blue' });
                            parentFound = true;
                        }
                    }
                }
            });

            if (!parentFound) {
                M.toast({ html: 'Сначала добавьте связь с родителем', classes: 'orange' });
            }
        }
    }

    // ─── МОДАЛКИ ─────────────────────────────────────────────────────────────

    openAddPersonModal() {
        document.getElementById('modal-title').innerHTML = '<i class="material-icons">person_add</i> Добавить человека';
        document.getElementById('person-form').reset();
        document.getElementById('person-id').value = '';
        document.getElementById('delete-person').style.display = 'none';
        document.getElementById('relations-container').innerHTML = '';

        M.updateTextFields();
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

        M.updateTextFields();
        document.getElementById('delete-person').style.display = 'inline-flex';

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
            M.toast({ html: 'Имя обязательно!', classes: 'red' });
            return;
        }

        let personId = id;

        if (id) {
            familyData.updatePerson(id, personData);
            M.toast({ html: 'Данные обновлены!', classes: 'green' });
        } else {
            const newPerson = familyData.addPerson(personData);
            personId = newPerson.id;
            M.toast({ html: 'Человек добавлен!', classes: 'green' });
        }

        // Сохранение связей
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

            if (relatedId && type) {
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
            M.toast({ html: 'Человек удалён', classes: 'red' });

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
            if (type === 'child') return fromId === id ? 'Ребёнок' : 'Родитель';
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
                    `;
            }).join('') : '<p>Нет связей</p>'}
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

    // ─── ЭКСПОРТ / ИМПОРТ ────────────────────────────────────────────────────

    exportData() {
        const data = familyData.exportToJSON();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'family-tree.json';
        a.click();
        URL.revokeObjectURL(url);
        M.toast({ html: 'Данные экспортированы!', classes: 'green' });
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
                M.toast({ html: 'Данные импортированы!', classes: 'green' });
            } else {
                M.toast({ html: 'Ошибка импорта данных', classes: 'red' });
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
