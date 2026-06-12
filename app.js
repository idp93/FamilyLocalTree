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

    // ─── ВЫЧИСЛЕНИЕ ПОЗИЦИЙ (без коллизий) ─────────────────────────────────────

    computeLayout(people) {
        const NODE_W = 200;
        const NODE_H = 160;
        const H_GAP = 40;
        const V_GAP = 100;
        const STEP = NODE_W + H_GAP; // 240

        const peopleSet = new Set(people.map(p => p.id));
        const relations = familyData.getAllRelations().filter(
            r => peopleSet.has(r.from) && peopleSet.has(r.to)
        );

        // from=parent, to=child
        const childrenOf = new Map();
        const parentsOf  = new Map();
        relations.filter(r => r.type === 'parent').forEach(r => {
            if (!childrenOf.has(r.from)) childrenOf.set(r.from, []);
            childrenOf.get(r.from).push(r.to);
            if (!parentsOf.has(r.to)) parentsOf.set(r.to, []);
            parentsOf.get(r.to).push(r.from);
        });

        const spouseOf = new Map();
        relations.filter(r => r.type === 'spouse').forEach(r => {
            if (!spouseOf.has(r.from)) spouseOf.set(r.from, []);
            spouseOf.get(r.from).push(r.to);
            if (!spouseOf.has(r.to)) spouseOf.set(r.to, []);
            spouseOf.get(r.to).push(r.from);
        });

        // BFS уровни
        const levelOf = new Map();
        const allChildIds = new Set(parentsOf.keys());
        let roots = people.filter(p => !allChildIds.has(p.id));
        if (roots.length === 0) roots = [people[0]];

        const bfsQueue = roots.map(r => r.id);
        roots.forEach(r => levelOf.set(r.id, 0));
        for (let i = 0; i < bfsQueue.length; i++) {
            const pid = bfsQueue[i];
            const lvl = levelOf.get(pid);
            (childrenOf.get(pid) || []).forEach(cid => {
                if (!levelOf.has(cid)) { levelOf.set(cid, lvl + 1); bfsQueue.push(cid); }
            });
        }
        people.forEach(p => { if (!levelOf.has(p.id)) levelOf.set(p.id, 0); });

        const maxLevel = Math.max(...levelOf.values());
        const levels = Array.from({ length: maxLevel + 1 }, () => []);
        people.forEach(p => levels[levelOf.get(p.id)].push(p.id));

        const posX = new Map();
        const posY = new Map();
        people.forEach(p => posY.set(p.id, levelOf.get(p.id) * (NODE_H + V_GAP)));

        // Группы на уровне: пара супругов или одиночка
        const getLevelGroups = (lvl) => {
            const ids = levels[lvl];
            const groups = [], used = new Set();
            ids.forEach(id => {
                if (used.has(id)) return;
                const sp = (spouseOf.get(id) || []).find(
                    s => levelOf.get(s) === lvl && !used.has(s)
                );
                if (sp) {
                    groups.push([id, sp]);
                    used.add(id); used.add(sp);
                } else {
                    groups.push([id]);
                    used.add(id);
                }
            });
            return groups;
        };

        // Рекурсивное размещение: сначала дети, затем родители над ними
        const placed = new Set();
        let gx = NODE_W / 2;

        const placeGroup = (group, lvl) => {
            const [primary, spouse] = group;
            if (placed.has(primary)) return;

            const allCh = new Set();
            (childrenOf.get(primary) || []).forEach(c => allCh.add(c));
            if (spouse) (childrenOf.get(spouse) || []).forEach(c => allCh.add(c));

            // Рекурсивно размещаем детей
            if (lvl < maxLevel) {
                getLevelGroups(lvl + 1)
                    .filter(g => g.some(id => allCh.has(id)) && !placed.has(g[0]))
                    .forEach(g => placeGroup(g, lvl + 1));
            }

            placed.add(primary);
            if (spouse) placed.add(spouse);

            // Центр над детьми
            const childXs = [...allCh].filter(c => posX.has(c)).map(c => posX.get(c));
            const mid = childXs.length > 0
                ? (Math.min(...childXs) + Math.max(...childXs)) / 2
                : null;

            if (spouse) {
                // Пара: два слота рядом
                const pairLeft = mid !== null ? Math.max(mid - STEP / 2, gx) : gx;
                posX.set(primary, pairLeft + NODE_W / 2);
                posX.set(spouse,  pairLeft + STEP + NODE_W / 2);
                gx = Math.max(gx, pairLeft + 2 * STEP + H_GAP / 2);
            } else {
                // Одиночка
                const x = mid !== null ? Math.max(mid, gx) : gx;
                posX.set(primary, x);
                gx = Math.max(gx, x + STEP);
            }
        };

        getLevelGroups(0).forEach(g => placeGroup(g, 0));
        // Изолированные узлы
        people.forEach(p => {
            if (!posX.has(p.id)) { posX.set(p.id, gx + NODE_W / 2); gx += STEP; }
        });

        // Устраняем оставшиеся коллизии
        const shiftSubtree = (id, dx, visited) => {
            if (!dx || visited.has(id)) return;
            visited.add(id);
            posX.set(id, posX.get(id) + dx);
            (childrenOf.get(id) || []).forEach(c => shiftSubtree(c, dx, visited));
        };

        const resolveLevel = (lvl) => {
            const ids = [...levels[lvl]].sort((a, b) => posX.get(a) - posX.get(b));
            for (let i = 1; i < ids.length; i++) {
                const needed = posX.get(ids[i - 1]) + STEP;
                if (posX.get(ids[i]) < needed) {
                    shiftSubtree(ids[i], needed - posX.get(ids[i]), new Set());
                }
            }
        };

        for (let pass = 0; pass < 4; pass++) {
            for (let l = 0; l <= maxLevel; l++) resolveLevel(l);
            // Перецентрируем родителей над детьми
            for (let l = maxLevel - 1; l >= 0; l--) {
                levels[l].forEach(pid => {
                    const ch = (childrenOf.get(pid) || []).filter(c => posX.has(c));
                    if (ch.length > 0) {
                        const xs = ch.map(c => posX.get(c));
                        posX.set(pid, (Math.min(...xs) + Math.max(...xs)) / 2);
                    }
                });
                resolveLevel(l);
            }
        }

        // Нормализация
        const minX = Math.min(...posX.values()) - NODE_W / 2 - 40;
        const minY = Math.min(...posY.values()) - 40;
        posX.forEach((v, k) => posX.set(k, v - minX));
        posY.forEach((v, k) => posY.set(k, v - minY));

        const canvasW = Math.max(...Array.from(posX.values()).map(x => x + NODE_W / 2)) + 40;
        const canvasH = Math.max(...Array.from(posY.values()).map(y => y + NODE_H)) + 60;

        return { posX, posY, NODE_W, NODE_H, relations, spouseOf, childrenOf, parentsOf, width: canvasW, height: canvasH };
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
