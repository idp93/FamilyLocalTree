// FamilyLocalTree - Data Management
// Хранение данных в localStorage

const STORAGE_KEY = 'familyTreeData';

// Default sample data
const defaultData = {
    people: [
        {
            id: '1',
            name: 'Александр',
            surname: 'Иванов',
            birthDate: '1960-05-15',
            deathDate: null,
            city: 'Москва',
            photo: '',
            notes: 'Основатель семейного древа'
        },
        {
            id: '2',
            name: 'Мария',
            surname: 'Иванова',
            birthDate: '1962-08-20',
            deathDate: null,
            city: 'Москва',
            photo: '',
            notes: ''
        },
        {
            id: '3',
            name: 'Елена',
            surname: 'Иванова',
            birthDate: '1985-03-10',
            deathDate: null,
            city: 'Санкт-Петербург',
            photo: '',
            notes: 'Дочь'
        },
        {
            id: '4',
            name: 'Дмитрий',
            surname: 'Иванов',
            birthDate: '1988-11-25',
            deathDate: null,
            city: 'Москва',
            photo: '',
            notes: 'Сын'
        },
        {
            id: '5',
            name: 'Анна',
            surname: 'Петрова',
            birthDate: '1990-07-14',
            deathDate: null,
            city: 'Казань',
            photo: '',
            notes: 'Внучка'
        }
    ],
    relations: [
        { from: '1', to: '2', type: 'spouse' },
        { from: '1', to: '3', type: 'parent' },
        { from: '2', to: '3', type: 'parent' },
        { from: '1', to: '4', type: 'parent' },
        { from: '2', to: '4', type: 'parent' },
        { from: '3', to: '5', type: 'parent' }
    ]
};

class FamilyTreeData {
    constructor() {
        this.data = this.load();
    }

    load() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Error loading data:', e);
            }
        }
        return this.getDefaultData();
    }

    getDefaultData() {
        return JSON.parse(JSON.stringify(defaultData));
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    reset() {
        this.data = this.getDefaultData();
        this.save();
    }

    // Person CRUD
    getAllPeople() {
        return this.data.people;
    }

    getPerson(id) {
        return this.data.people.find(p => p.id === id);
    }

    addPerson(person) {
        const id = Date.now().toString();
        const newPerson = { ...person, id };
        this.data.people.push(newPerson);
        this.save();
        return newPerson;
    }

    updatePerson(id, updates) {
        const index = this.data.people.findIndex(p => p.id === id);
        if (index !== -1) {
            this.data.people[index] = { ...this.data.people[index], ...updates };
            this.save();
            return this.data.people[index];
        }
        return null;
    }

    deletePerson(id) {
        this.data.people = this.data.people.filter(p => p.id !== id);
        this.data.relations = this.data.relations.filter(
            r => r.from !== id && r.to !== id
        );
        this.save();
    }

    // Relations CRUD
    getAllRelations() {
        return this.data.relations;
    }

    getRelationsForPerson(personId) {
        return this.data.relations.filter(
            r => r.from === personId || r.to === personId
        );
    }

    addRelation(from, to, type) {
        // Check if relation already exists
        const exists = this.data.relations.some(
            r => (r.from === from && r.to === to) || (r.from === to && r.to === from)
        );
        if (!exists) {
            this.data.relations.push({ from, to, type });
            this.save();
        }
    }

    updateRelation(from, to, newType) {
        const relation = this.data.relations.find(
            r => r.from === from && r.to === to
        );
        if (relation) {
            relation.type = newType;
            this.save();
        }
    }

    removeRelation(from, to) {
        this.data.relations = this.data.relations.filter(
            r => !(r.from === from && r.to === to)
        );
        this.save();
    }

    // Get related people
    getRelatedPeople(personId) {
        const relations = this.getRelationsForPerson(personId);
        return relations.map(rel => {
            const relatedId = rel.from === personId ? rel.to : rel.from;
            const person = this.getPerson(relatedId);
            if (person) {
                return {
                    ...person,
                    relationType: rel.type,
                    relationFrom: rel.from
                };
            }
            return null;
        }).filter(Boolean);
    }

    // Get people by relation type
    getPeopleByRelation(personId, relationType) {
        return this.getRelatedPeople(personId).filter(
            p => p.relationType === relationType
        );
    }

    // Get unique cities
    getCities() {
        const cities = new Set();
        this.data.people.forEach(p => {
            if (p.city) cities.add(p.city);
        });
        return Array.from(cities).sort();
    }

    // Filter people
    filterPeople(filters) {
        let people = this.getAllPeople();

        if (filters.city) {
            people = people.filter(p => 
                p.city && p.city.toLowerCase().includes(filters.city.toLowerCase())
            );
        }

        if (filters.yearFrom) {
            const year = parseInt(filters.yearFrom);
            people = people.filter(p => {
                if (!p.birthDate) return false;
                return new Date(p.birthDate).getFullYear() >= year;
            });
        }

        if (filters.yearTo) {
            const year = parseInt(filters.yearTo);
            people = people.filter(p => {
                if (!p.birthDate) return false;
                return new Date(p.birthDate).getFullYear() <= year;
            });
        }

        if (filters.relation) {
            const personIds = new Set();
            this.data.relations.forEach(r => {
                if (r.type === filters.relation) {
                    personIds.add(r.from);
                    personIds.add(r.to);
                }
            });
            people = people.filter(p => personIds.has(p.id));
        }

        return people;
    }

    // Export/Import
    exportToJSON() {
        return JSON.stringify(this.data, null, 2);
    }

    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.people && data.relations) {
                this.data = data;
                this.save();
                return true;
            }
        } catch (e) {
            console.error('Import error:', e);
        }
        return false;
    }

    // Build tree structure
    buildTree() {
        const people = this.getAllPeople();
        const relations = this.getAllRelations();
        
        // Find root nodes (people who are parents but not children)
        const parentIds = new Set();
        const childIds = new Set();
        
        relations.forEach(r => {
            if (r.type === 'parent') {
                parentIds.add(r.from);
                childIds.add(r.to);
            }
        });
        
        const roots = people.filter(p => {
            // Root if has children and is not a child
            const hasChildren = relations.some(r => r.from === p.id && r.type === 'parent');
            const isChild = childIds.has(p.id);
            return hasChildren && !isChild;
        });
        
        // If no roots found, use first person
        if (roots.length === 0 && people.length > 0) {
            roots.push(people[0]);
        }
        
        return roots;
    }
}

// Global instance
const familyData = new FamilyTreeData();