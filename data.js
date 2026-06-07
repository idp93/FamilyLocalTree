// FamilyLocalTree - Data Module with patronymic support

class FamilyData {
    constructor() {
        this.people = [];
        this.relations = [];
        this.loadFromStorage();
    }

    // Storage
    loadFromStorage() {
        const saved = localStorage.getItem('familyTreeData');
        if (saved) {
            const data = JSON.parse(saved);
            this.people = data.people || [];
            this.relations = data.relations || [];
        } else {
            this.loadTestData();
        }
    }

    saveToStorage() {
        localStorage.setItem('familyTreeData', JSON.stringify({
            people: this.people,
            relations: this.relations
        }));
    }

    // Test data
    loadTestData() {
        this.people = [
            // Husband's side - дедушки и бабушки мужа
            { id: 'p1', name: 'Александр', surname: 'Иванов', patronymic: 'Петрович', birthDate: '1940-05-15', deathDate: '2015-03-20', deathPlace: 'Москва', city: 'Москва' },
            { id: 'p2', name: 'Мария', surname: 'Иванова', patronymic: 'Сергеевна', birthDate: '1942-08-20', city: 'Москва' },
            { id: 'p3', name: 'Пётр', surname: 'Иванов', patronymic: 'Петрович', birthDate: '1915-02-10', deathDate: '1985-11-05', deathPlace: 'Москва', city: 'Москва' },
            { id: 'p4', name: 'Анна', surname: 'Иванова', patronymic: 'Ивановна', birthDate: '1918-07-14', deathDate: '1990-06-12', deathPlace: 'Москва', city: 'Москва' },
            { id: 'p5', name: 'Сергей', surname: 'Иванов', patronymic: 'Петрович', birthDate: '1912-03-25', deathDate: '1978-09-30', deathPlace: 'Санкт-Петербург', city: 'Санкт-Петербург' },
            { id: 'p6', name: 'Екатерина', surname: 'Иванова', patronymic: 'Петровна', birthDate: '1915-12-01', deathDate: '1982-04-18', deathPlace: 'Санкт-Петербург', city: 'Санкт-Петербург' },
            
            // Wife's side - прадедушки и прабабушки жены
            { id: 'p7', name: 'Михаил', surname: 'Петров', patronymic: 'Иванович', birthDate: '1935-01-10', deathDate: '2010-08-15', deathPlace: 'Киев', city: 'Киев' },
            { id: 'p8', name: 'Наталья', surname: 'Петрова', patronymic: 'Михайловна', birthDate: '1938-04-22', city: 'Киев' },
            { id: 'p9', name: 'Иван', surname: 'Петров', patronymic: 'Иванович', birthDate: '1908-06-30', deathDate: '1975-02-14', deathPlace: 'Киев', city: 'Киев' },
            { id: 'p10', name: 'Ольга', surname: 'Петрова', patronymic: 'Ивановна', birthDate: '1912-09-18', deathDate: '1988-12-25', deathPlace: 'Киев', city: 'Киев' },
            { id: 'p11', name: 'Владимир', surname: 'Петров', patronymic: 'Иванович', birthDate: '1910-11-05', deathDate: '1965-07-20', deathPlace: 'Харьков', city: 'Харьков' },
            { id: 'p12', name: 'Татьяна', surname: 'Петрова', patronymic: 'Владимировна', birthDate: '1914-02-28', deathDate: '1995-05-10', deathPlace: 'Харьков', city: 'Харьков' },
            
            // Parents
            { id: 'p13', name: 'Дмитрий', surname: 'Иванов', patronymic: 'Александрович', birthDate: '1970-03-12', city: 'Москва' },
            { id: 'p14', name: 'Елена', surname: 'Иванова', patronymic: 'Михайловна', birthDate: '1972-11-25', city: 'Москва' },
            { id: 'p15', name: 'Андрей', surname: 'Петров', patronymic: 'Михайлович', birthDate: '1968-07-08', city: 'Москва' },
            { id: 'p16', name: 'Светлана', surname: 'Петрова', patronymic: 'Владимировна', birthDate: '1971-10-30', city: 'Москва' },
            
            // Husband and wife
            { id: 'p17', name: 'Иван', surname: 'Иванов', patronymic: 'Дмитриевич', birthDate: '1995-06-14', city: 'Москва' },
            { id: 'p18', name: 'Анна', surname: 'Иванова', patronymic: 'Андреевна', birthDate: '1998-02-28', city: 'Москва' },
            
            // Siblings
            { id: 'p19', name: 'Мария', surname: 'Иванова', patronymic: 'Дмитриевна', birthDate: '1992-09-10', city: 'Москва' },
            { id: 'p20', name: 'Алексей', surname: 'Петров', patronymic: 'Андреевич', birthDate: '1996-12-05', city: 'Москва' },
            
            // Children
            { id: 'p21', name: 'Егор', surname: 'Иванов', patronymic: 'Иванович', birthDate: '2015-04-20', city: 'Москва' },
            { id: 'p22', name: 'Полина', surname: 'Иванова', patronymic: 'Ивановна', birthDate: '2018-08-15', city: 'Москва' }
        ];
        
        this.relations = [
            // Husband's lineage
            { from: 'p1', to: 'p3', type: 'parent' },
            { from: 'p2', to: 'p3', type: 'parent' },
            { from: 'p1', to: 'p5', type: 'parent' },
            { from: 'p2', to: 'p5', type: 'parent' },
            { from: 'p3', to: 'p13', type: 'parent' },
            { from: 'p4', to: 'p13', type: 'parent' },
            { from: 'p5', to: 'p14', type: 'parent' },
            { from: 'p6', to: 'p14', type: 'parent' },
            { from: 'p13', to: 'p17', type: 'parent' },
            { from: 'p14', to: 'p17', type: 'parent' },
            { from: 'p13', to: 'p19', type: 'parent' },
            { from: 'p14', to: 'p19', type: 'parent' },
            
            // Wife's lineage
            { from: 'p7', to: 'p9', type: 'parent' },
            { from: 'p8', to: 'p9', type: 'parent' },
            { from: 'p7', to: 'p11', type: 'parent' },
            { from: 'p8', to: 'p11', type: 'parent' },
            { from: 'p9', to: 'p15', type: 'parent' },
            { from: 'p10', to: 'p15', type: 'parent' },
            { from: 'p11', to: 'p16', type: 'parent' },
            { from: 'p12', to: 'p16', type: 'parent' },
            { from: 'p15', to: 'p18', type: 'parent' },
            { from: 'p16', to: 'p18', type: 'parent' },
            { from: 'p15', to: 'p20', type: 'parent' },
            { from: 'p16', to: 'p20', type: 'parent' },
            
            // Spouses
            { from: 'p1', to: 'p2', type: 'spouse' },
            { from: 'p3', to: 'p4', type: 'spouse' },
            { from: 'p5', to: 'p6', type: 'spouse' },
            { from: 'p7', to: 'p8', type: 'spouse' },
            { from: 'p9', to: 'p10', type: 'spouse' },
            { from: 'p11', to: 'p12', type: 'spouse' },
            { from: 'p13', to: 'p14', type: 'spouse' },
            { from: 'p15', to: 'p16', type: 'spouse' },
            { from: 'p17', to: 'p18', type: 'spouse' },
            
            // Siblings
            { from: 'p13', to: 'p19', type: 'sibling' },
            { from: 'p15', to: 'p16', type: 'sibling' },
            { from: 'p15', to: 'p20', type: 'sibling' },
            
            // Children
            { from: 'p17', to: 'p21', type: 'parent' },
            { from: 'p18', to: 'p21', type: 'parent' },
            { from: 'p17', to: 'p22', type: 'parent' },
            { from: 'p18', to: 'p22', type: 'parent' }
        ];
        
        this.saveToStorage();
    }

    // CRUD
    addPerson(data) {
        const id = 'p' + Date.now();
        const person = { id, ...data };
        this.people.push(person);
        this.saveToStorage();
        return person;
    }

    updatePerson(id, data) {
        const index = this.people.findIndex(p => p.id === id);
        if (index !== -1) {
            this.people[index] = { ...this.people[index], ...data };
            this.saveToStorage();
        }
    }

    deletePerson(id) {
        this.people = this.people.filter(p => p.id !== id);
        this.relations = this.relations.filter(r => r.from !== id && r.to !== id);
        this.saveToStorage();
    }

    getPerson(id) {
        return this.people.find(p => p.id === id);
    }

    getAllPeople() {
        return [...this.people];
    }

    // Relations
    addRelation(from, to, type) {
        this.relations.push({ from, to, type });
        this.saveToStorage();
    }

    removeRelation(from, to) {
        this.relations = this.relations.filter(r => 
            !(r.from === from && r.to === to) && !(r.from === to && r.to === from)
        );
        this.saveToStorage();
    }

    getRelationsForPerson(id) {
        return this.relations.filter(r => r.from === id || r.to === id);
    }

    getAllRelations() {
        return [...this.relations];
    }

    getRelatedPeople(id) {
        const relations = this.getRelationsForPerson(id);
        return relations.map(r => {
            const relatedId = r.from === id ? r.to : r.from;
            const person = this.getPerson(relatedId);
            if (!person) return null;
            return {
                ...person,
                relationType: r.type,
                relationFrom: r.from
            };
        }).filter(p => p);
    }

    // Get ancestors (parents, grandparents, etc.)
    // Соглашение: { from: parent_id, to: child_id, type: 'parent' }
    // Значит предки человека id — это те, кто стоит в r.from, когда r.to === id
    getAncestors(id, generations = 10) {
        if (generations <= 0) return [];
        
        const relations = this.getRelationsForPerson(id);
        // Родители: записи где id стоит как ребёнок (r.to === id)
        const parentRelations = relations.filter(r => r.type === 'parent' && r.to === id);
        
        let ancestors = [];
        parentRelations.forEach(r => {
            const parent = this.getPerson(r.from);
            if (parent) {
                ancestors.push(parent);
                ancestors = ancestors.concat(this.getAncestors(parent.id, generations - 1));
            }
        });
        
        return ancestors;
    }

    // Get descendants (children, grandchildren, etc.)
    // Дети человека id — это те, кто стоит в r.to, когда r.from === id
    getDescendants(id, generations = 10) {
        if (generations <= 0) return [];
        
        const relations = this.getRelationsForPerson(id);
        // Дети: записи где id стоит как родитель (r.from === id)
        const childRelations = relations.filter(r => r.type === 'parent' && r.from === id);
        
        let descendants = [];
        childRelations.forEach(r => {
            const child = this.getPerson(r.to);
            if (child) {
                descendants.push(child);
                descendants = descendants.concat(this.getDescendants(child.id, generations - 1));
            }
        });
        
        return descendants;
    }

    // Filters
    getCities() {
        const cities = new Set();
        this.people.forEach(p => {
            if (p.city) cities.add(p.city);
        });
        return Array.from(cities).sort();
    }

    filterPeople(filters) {
        let result = this.people;
        
        if (filters.city) {
            result = result.filter(p => p.city === filters.city);
        }
        
        if (filters.yearFrom) {
            result = result.filter(p => {
                if (!p.birthDate) return false;
                return new Date(p.birthDate).getFullYear() >= parseInt(filters.yearFrom);
            });
        }
        
        if (filters.yearTo) {
            result = result.filter(p => {
                if (!p.birthDate) return false;
                return new Date(p.birthDate).getFullYear() <= parseInt(filters.yearTo);
            });
        }
        
        if (filters.line) {
            // Filter by person's lineage
            const ancestors = this.getAncestors(filters.line);
            const descendants = this.getDescendants(filters.line);
            const lineageIds = new Set([filters.line, ...ancestors.map(a => a.id), ...descendants.map(d => d.id)]);
            result = result.filter(p => lineageIds.has(p.id));
        }
        
        return result;
    }

    // Auto-generate patronymic from parent
    // Родитель: r.from === parent, r.to === child
    // Значит родитель человека personId — тот, у кого r.to === personId
    generatePatronymic(personId) {
        const person = this.getPerson(personId);
        if (!person) return '';
        
        const relations = this.getRelationsForPerson(personId);
        const parentRelation = relations.find(r => r.type === 'parent' && r.to === personId);
        
        if (parentRelation) {
            const parent = this.getPerson(parentRelation.from);
            if (parent && parent.name) {
                const parentName = parent.name;
                // Определяем пол по окончанию фамилии или отчества
                const isFemale = person.gender === 'female' ||
                    (person.surname && person.surname.endsWith('а')) ||
                    (person.patronymic && person.patronymic.endsWith('на'));
                
                // Строим отчество от имени отца
                let root = parentName;
                if (root.endsWith('а') || root.endsWith('я')) root = root.slice(0, -1);
                
                return isFemale ? root + 'овна' : root + 'ович';
            }
        }
        
        return '';
    }

    // Export/Import
    exportToJSON() {
        return JSON.stringify({
            people: this.people,
            relations: this.relations
        }, null, 2);
    }

    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.people && data.relations) {
                this.people = data.people;
                this.relations = data.relations;
                this.saveToStorage();
                return true;
            }
            return false;
        } catch (e) {
            console.error('Import error:', e);
            return false;
        }
    }
}

// Initialize global data instance
const familyData = new FamilyData();
