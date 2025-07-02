
function sortByName(a, b) {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    return aName.localeCompare(bName);
}

async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

function populateSelect(selectElement, data) {
    selectElement.innerHTML = '<option value="">Please select</option>';
    data.forEach(item => {
        const option = document.createElement('option');
        option.textContent = item.name;
        option.dataset.pid = item.pid;
        selectElement.appendChild(option);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const changwatSelect = document.querySelector('#changwat');
    const amphoeSelect = document.querySelector('#amphoe');
    const tambonSelect = document.querySelector('#tambon');
    const form = document.querySelector('form');
    const resultElement = document.querySelector('#result');
    const codeElement = resultElement.querySelector('code');

    try {
        const [changwats, amphoes, tambons] = await Promise.all([
            fetchData('data/changwats/json/en.json'),
            fetchData('data/amphoes/json/en.json'),
            fetchData('data/tambons/json/en.json')
        ]);

        const changwatsData = changwats.en.changwats.sort(sortByName);
        const amphoesData = amphoes.en.amphoes.sort(sortByName);
        const tambonsData = tambons.en.tambons.sort(sortByName);

        populateSelect(changwatSelect, changwatsData);

        changwatSelect.addEventListener('change', () => {
            const selectedPid = changwatSelect.options[changwatSelect.selectedIndex].dataset.pid;
            const filteredAmphoes = amphoesData.filter(amphoe => amphoe.changwat_pid === selectedPid);
            populateSelect(amphoeSelect, filteredAmphoes);
            populateSelect(tambonSelect, []); // Reset tambon
        });

        amphoeSelect.addEventListener('change', () => {
            const selectedPid = amphoeSelect.options[amphoeSelect.selectedIndex].dataset.pid;
            const filteredTambons = tambonsData.filter(tambon => tambon.amphoe_pid === selectedPid);
            populateSelect(tambonSelect, filteredTambons);
        });

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const data = {};

            for (const [key, value] of formData.entries()) {
                const selectElement = form.querySelector(`[name="${key}"]`);
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

            codeElement.textContent = JSON.stringify(data, null, 2);
            resultElement.style.display = 'block';
            if (window.hljs) {
                window.hljs.highlightBlock(codeElement);
            }
        });

    } catch (error) {
        console.error('Failed to load address data:', error);
        // Optionally, display an error message to the user
    }
});
