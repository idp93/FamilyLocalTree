// FamilyLocalTree - Data Management
// Хранение данных в localStorage

const STORAGE_KEY = 'familyTreeData';

// Тестовые данные: полная семья
const defaultData = {
    people: [
        // Дедушки и бабушки по линии мужа (дедушка Сергей)
        {
            id: '1',
            name: 'Сергей',
            surname: 'Петров',
            birthDate: '1940-03-15',
            deathDate: '2015-08-20',
            city: 'Москва',
            photo: '',
            notes: 'Дедушка по линии мужа'
        },
        {
            id: '2',
            name: 'Анна',
            surname: 'Петрова',
            birthDate: '1942-06-10',
            deathDate: '2020-01-05',
            city: 'Москва',
            photo: '',
            notes: 'Бабушка по линии мужа'
        },
        // Дедушки и бабушки по линии жены
        {
            id: '3',
            name: 'Михаил',
            surname: 'Сидоров',
            birthDate: '1938-11-22',
            deathDate: '2012-04-18',
            city: 'Санкт-Петербург',
            photo: '',
            notes: 'Дедушка по линии жены'
        },
        {
            id: '4',
            name: 'Елена',
            surname: 'Сидорова',
            birthDate: '1940-02-14',
            deathDate: '2018-09-30',
            city: 'Санкт-Петербург',
            photo: '',
            notes: 'Бабушка по линии жены'
        },
        // Дедушки и бабушки по линии мужа (вторая пара - бабушка мужа отца)
        {
            id: '5',
            name: 'Владимир',
            surname: 'Петров',
            birthDate: '1935-07-08',
            deathDate: '2005-12-25',
            city: 'Москва',
            photo: '',
            notes: 'Прадедушка'
        },
        {
            id: '6',
            name: 'Мария',
            surname: 'Петрова',
            birthDate: '1938-09-01',
            deathDate: '2010-03-15',
            city: 'Москва',
            photo: '',
            notes: 'Прабабушка'
        },
        // Дедушки и бабушки по линии жены (вторая пара)
        {
            id: '7',
            name: 'Иван',
            surname: 'Сидоров',
            birthDate: '1936-05-20',
            deathDate: '2008-11-10',
            city: 'Ленинградская обл.',
            photo: '',
            notes: 'Прадедушка'
        },
        {
            id: '8',
            name: 'Ольга',
            surname: 'Сидорова',
            birthDate: '1941-12-03',
            deathDate: '2016-06-22',
            city: 'Ленинградская обл.',
            photo: '',
            notes: 'Прабабушка'
        },
        // Родители мужа
        {
            id: '9',
            name: 'Александр',
            surname: 'Петров',
            birthDate: '1965-01-25',
            deathDate: null,
            city: 'Москва',
            photo: '',
            notes: 'Отец мужа'
        },
        {
            id: '10',
            name: 'Наталья',
            surname: 'Петрова',
            birthDate: '1967-04-18',
            deathDate: null,
            city: 'Москва',
            photo: '',
            notes: 'Мать мужа'
        },
        // Родители жены
        {
            id: '11',
            name: 'Дмитрий',
            surname: 'Сидоров',
            birthDate: '1963-08-12',
            deathDate: null,
            city: 'Санкт-Петербург',
            photo: '',
            notes: 'Отец жены'
        },
        {
            id: '12',
            name: 'Ирина',
            surname: 'Сидорова',
            birthDate: '1965-10-30',
            deathDate: null,
            city: 'Санкт-Петербург',
            photo: '',
            notes: 'Мать жены'
        },
        // Муж (главный персонаж)
        {
            id: '13',
            name: 'Иван',
            surname: 'Петров',
            birthDate: '1990-05-15',
            deathDate: null,
            city: 'Москва',
            photo: '',
            notes: 'Муж, глава семьи'
        },
        // Сестра мужа
        {
            id: '14',
            name: 'Ольга',
            surname: 'Петрова',
            birthDate: '1992-08-20',
            deathDate: null,
            city: 'Москва',
            photo: '',
            notes: 'Сестра мужа'
        },
        // Брат мужа
        {
            id: '15',
            name: 'Андрей',
            surname: 'Петров',
            birthDate: '1995-02-14',
            deathDate: null,
            city: 'Москва',
            photo: '',
            notes: 'Брат мужа'
        },
        // Жена
        {
            id: '16',
            name: 'Мария',
            surname: 'Петрова',
            birthDate: '1992-11-08',
            deathDate: null,
            city: 'Москва',
            photo: '',
            notes: 'Жена'
        },
        // Сестра жены
        {
            id: '17',
            name: 'Анна',
            surname: 'Сидорова',
            birthDate: '1994-06-25',
            deathDate: null,
            city: 'Санкт-Петербург',
            photo: '',
            notes: 'Сестра жены'
        },
        // Брат жены
        {
            id: '18',
            name: 'Павел',
            surname: 'Сидоров',
            birthDate: '1997-03-10',
            deathDate: null,
            city: 'Санкт-Петербург',
            photo: '',
            notes: 'Брат жены'
        },
        // Сын (старший ребёнок)
        {
            id: '19',
            name: 'Алексей',
            surname: 'Петров',
            birthDate: '2015-07-22',
            deathDate: null,
            city: 'Москва',
            photo: '',
            notes: 'Сын, старший ребёнок'
        },
        // Дочь (младшая)
        {
            id: '20',
            name: 'Екатерина',
            surname: 'Петрова',
            birthDate: '2018-12-05',
            deathDate: null,
            city: 'Москва',
            photo: '',
            notes: 'Дочь, младший ребёнок'
        }
    ],
    relations: [
        // Дедушки и бабушки - родители дедушки Сергея
        { from: '5', to: '1', type: 'parent' },
        { from: '6', to: '1', type: 'parent' },
        // Дедушки и бабушки - родители бабушки Анны
        { from: '5', to: '2', type: 'spouse' },
        { from: '6', to: '2', type: 'spouse' },
        // Дедушки и бабушки - родители дедушки Михаила
        { from: '7', to: '3', type: 'parent' },
        { from: '8', to: '3', type: 'parent' },
        // Дедушки и бабушки - родители бабушки Елены
        { from: '7', to: '4', type: 'spouse' },
        { from: '8', to: '4', type: 'spouse' },
        // Родители мужа (Александр и Наталья - дети Сергея и Анны)
        { from: '1', to: '9', type: 'parent' },
        { from: '2', to: '9', type: 'parent' },
        { from: '1', to: '10', type: 'parent' },
        { from: '2', to: '10', type: 'parent' },
        { from: '9', to: '10', type: 'spouse' },
        // Родители жены (Дмитрий и Ирина - дети Михаила и Елены)
        { from: '3', to: '11', type: 'parent' },
        { from: '4', to: '11', type: 'parent' },
        { from: '3', to: '12', type: 'parent' },
        { from: '4', to: '12', type: 'parent' },
        { from: '11', to: '12', type: 'spouse' },
        // Муж (Иван) - сын Александра и Натальи
        { from: '9', to: '13', type: 'parent' },
        { from: '10', to: '13', type: 'parent' },
        // Сестра мужа (Ольга) - дочь Александра и Натальи
        { from: '9', to: '14', type: 'parent' },
        { from: '10', to: '14', type: 'parent' },
        // Брат мужа (Андрей) - сын Александра и Натальи
        { from: '9', to: '15', type: 'parent' },
        { from: '10', to: '15', type: 'parent' },
        // Братья и сёстры мужа между собой
        { from: '13', to: '14', type: 'sibling' },
        { from: '13', to: '15', type: 'sibling' },
        { from: '14', to: '15', type: 'sibling' },
        // Жена (Мария) - дочь Дмитрия и Ирины
        { from: '11', to: '16', type: 'parent' },
        { from: '12', to: '16', type: 'parent' },
        // Сестра жены (Анна) - дочь Дмитрия и Ирины
        { from: '11', to: '17', type: 'parent' },
        { from: '12', to: '17', type: 'parent' },
        // Брат жены (Павел) - сын Дмитрия и Ирины
        { from: '11', to: '18', type: 'parent' },
        { from: '12', to: '18', type: 'parent' },
        // Братья и сёстры жены между собой
        { from: '16', to: '17', type: 'sibling' },
        { from: '16', to: '18', type: 'sibling' },
        { from: '17', to: '18', type: 'sibling' },
        // Муж и жена - супруги
        { from: '13', to: '16', type: 'spouse' },
        // Дети (Алексей и Екатерина) - дети Ивана и Марии
        { from: '13', to: '19', type: 'parent' },
        { from: '16', to: '19', type: 'parent' },
        { from: '13', to: '20', type: 'parent' },
        { from: '16', to: '20', type: 'parent' },
        // Братья и сёстры между собой
        { from: '19', to: '20', type: 'sibling' }
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