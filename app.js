
const CONFIG = {
    DATA_PATHS: {
        CHANGWATS: 'data/changwats/json/en.json',
        AMPHOES: 'data/amphoes/json/en.json',
        TAMBONS: 'data/tambons/json/en.json'
    },
    SELECTORS: {
        CHANGWAT: '#changwat',
        AMPHOE: '#amphoe',
        TAMBON: '#tambon',
        FORM: 'form',
        RESULT: '#result',
        CODE: '#result code'
    },
    CACHE_KEY: 'thai_address_data',
    CACHE_DURATION: 24 * 60 * 60 * 1000
};

class ThaiAddressForm {
    constructor() {
        this.cache = new Map();
        this.dataLookups = {
            amphoes: new Map(),
            tambons: new Map()
        };
        this.elements = {};
        this.loadedData = {
            changwats: null,
            amphoes: null,
            tambons: null
        };
    }

    async init() {
        try {
            this.cacheElements();
            await this.loadInitialData();
            this.setupEventListeners();
        } catch (error) {
            this.handleError('Failed to initialize form', error);
        }
    }

    cacheElements() {
        this.elements = {
            changwat: document.querySelector(CONFIG.SELECTORS.CHANGWAT),
            amphoe: document.querySelector(CONFIG.SELECTORS.AMPHOE),
            tambon: document.querySelector(CONFIG.SELECTORS.TAMBON),
            form: document.querySelector(CONFIG.SELECTORS.FORM),
            result: document.querySelector(CONFIG.SELECTORS.RESULT),
            code: document.querySelector(CONFIG.SELECTORS.CODE)
        };
    }

    async loadInitialData() {
        const cachedData = this.getCachedData();
        
        if (cachedData) {
            this.loadedData.changwats = cachedData.changwats;
            this.populateSelect(this.elements.changwat, this.loadedData.changwats);
            return;
        }

        const changwats = await this.fetchData(CONFIG.DATA_PATHS.CHANGWATS);
        this.loadedData.changwats = changwats.en.changwats.sort(this.sortByName);
        this.populateSelect(this.elements.changwat, this.loadedData.changwats);
        
        this.setCachedData({ changwats: this.loadedData.changwats });
    }

    async loadDistrictData() {
        if (this.loadedData.amphoes && this.loadedData.tambons) return;

        const [amphoes, tambons] = await Promise.all([
            this.fetchData(CONFIG.DATA_PATHS.AMPHOES),
            this.fetchData(CONFIG.DATA_PATHS.TAMBONS)
        ]);

        this.loadedData.amphoes = amphoes.en.amphoes.sort(this.sortByName);
        this.loadedData.tambons = tambons.en.tambons.sort(this.sortByName);

        this.buildLookupMaps();
        
        const cachedData = this.getCachedData() || {};
        this.setCachedData({
            ...cachedData,
            amphoes: this.loadedData.amphoes,
            tambons: this.loadedData.tambons
        });
    }

    buildLookupMaps() {
        this.loadedData.amphoes.forEach(amphoe => {
            if (!this.dataLookups.amphoes.has(amphoe.changwat_pid)) {
                this.dataLookups.amphoes.set(amphoe.changwat_pid, []);
            }
            this.dataLookups.amphoes.get(amphoe.changwat_pid).push(amphoe);
        });

        this.loadedData.tambons.forEach(tambon => {
            if (!this.dataLookups.tambons.has(tambon.amphoe_pid)) {
                this.dataLookups.tambons.set(tambon.amphoe_pid, []);
            }
            this.dataLookups.tambons.get(tambon.amphoe_pid).push(tambon);
        });
    }

    setupEventListeners() {
        this.elements.changwat.addEventListener('change', async () => {
            await this.handleChangwatChange();
        });

        this.elements.amphoe.addEventListener('change', () => {
            this.handleAmphoeChange();
        });

        this.elements.form.addEventListener('submit', (event) => {
            this.handleFormSubmit(event);
        });
    }

    async handleChangwatChange() {
        const selectedOption = this.elements.changwat.options[this.elements.changwat.selectedIndex];
        const selectedPid = selectedOption.dataset.pid;

        if (!selectedPid) {
            this.populateSelect(this.elements.amphoe, []);
            this.populateSelect(this.elements.tambon, []);
            return;
        }

        await this.loadDistrictData();
        
        const filteredAmphoes = this.dataLookups.amphoes.get(selectedPid) || [];
        this.populateSelect(this.elements.amphoe, filteredAmphoes);
        this.populateSelect(this.elements.tambon, []);
    }

    handleAmphoeChange() {
        const selectedOption = this.elements.amphoe.options[this.elements.amphoe.selectedIndex];
        const selectedPid = selectedOption.dataset.pid;

        if (!selectedPid) {
            this.populateSelect(this.elements.tambon, []);
            return;
        }

        const filteredTambons = this.dataLookups.tambons.get(selectedPid) || [];
        this.populateSelect(this.elements.tambon, filteredTambons);
    }

    handleFormSubmit(event) {
        event.preventDefault();
        const formData = this.extractFormData();
        this.displayResult(formData);
    }

    extractFormData() {
        const formData = new FormData(this.elements.form);
        const data = {};

        for (const [key, value] of formData.entries()) {
            const selectElement = this.elements.form.querySelector(`[name="${key}"]`);
            if (selectElement && selectElement.tagName === 'SELECT') {
                const selectedOption = selectElement.options[selectElement.selectedIndex];
                data[key] = {
                    name: value,
                    pid: selectedOption.dataset.pid || null
                };
            } else {
                data[key] = value;
            }
        }

        return data;
    }

    displayResult(data) {
        this.elements.code.textContent = JSON.stringify(data, null, 2);
        this.elements.result.style.display = 'block';
        
        if (window.hljs) {
            window.hljs.highlightBlock(this.elements.code);
        }
    }

    async fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    populateSelect(selectElement, data) {
        selectElement.innerHTML = '<option value="">Please select</option>';
        data.forEach(item => {
            const option = document.createElement('option');
            option.textContent = item.name;
            option.dataset.pid = item.pid;
            selectElement.appendChild(option);
        });
    }

    sortByName(a, b) {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    }

    getCachedData() {
        try {
            const cached = localStorage.getItem(CONFIG.CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < CONFIG.CACHE_DURATION) {
                    return data.data;
                }
            }
        } catch (error) {
            console.warn('Failed to load cached data:', error);
        }
        return null;
    }

    setCachedData(data) {
        try {
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Failed to cache data:', error);
        }
    }

    handleError(message, error) {
        console.error(message, error);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
        errorDiv.textContent = 'Failed to load address data. Please refresh the page.';
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(errorDiv, container.firstChild);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = new ThaiAddressForm();
    form.init();
});
