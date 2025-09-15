// ==========================================
// IMRS Dashboard JavaScript
// ==========================================

// Global Variables
let currentData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 50;
let chart = null;
let map = null;
let selectedCountries = [];
let selectedSeries = [];
let selectedTime = [];
let selectedYears = [];
let applyChangesClicked = false;
let previousSelections = {
    countries: [],
    series: [],
    time: [],
    years: []
};

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 IMRS Dashboard ishga tushirilmoqda...');
    
    // Initialize components
    initializeDashboard();
    loadInitialData();
    setupEventListeners();
    
    console.log('✅ Dashboard muvaffaqiyatli yuklandi');
});

function initializeDashboard() {
    // Set default page
    showPage('analytics');
    
    // Set default view
    showView('table');
    
    // Initialize filters
    initializeFilters();
    
    // Setup file upload if on admin page
    setupFileUpload();
    
    // Load filter options
    loadFilterOptions();
}

// ==========================================
// PAGE NAVIGATION
// ==========================================

function showPage(pageId) {
    console.log(`📄 Switching to page: ${pageId}`);
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    
    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId + '-page');
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    // Add active class to clicked nav item
    if (event && event.target) {
        const navItem = event.target.closest('.nav-item');
        if (navItem) {
            navItem.classList.add('active');
        }
    }
    
    // Page-specific actions
    if (pageId === 'analytics') {
        loadAnalyticsData();
    } else if (pageId === 'admin') {
        loadAdminData();
    }
}

function switchTab(tabName) {
    console.log(`🔖 Switching to tab: ${tabName}`);
    
    // Remove active from all tabs
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Add active to clicked tab
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Tab-specific actions can be added here
    switch(tabName) {
        case 'variables':
            // Variables tab logic
            break;
        case 'design':
            showToast('Dizayn', 'Dizayn bo\'limi tez orada qo\'shiladi', 'info');
            break;
        case 'style':
            showToast('Stil', 'Stil bo\'limi tez orada qo\'shiladi', 'info');
            break;
        case 'save':
            exportCurrentView();
            break;
        case 'share':
            showToast('Ulashish', 'Ulashish bo\'limi tez orada qo\'shiladi', 'info');
            break;
        case 'add':
            showPage('admin');
            break;
    }
}

// ==========================================
// FILTER MANAGEMENT
// ==========================================

function initializeFilters() {
    // Initialize years
    generateYearsGrid(20);
    
    // Set up section toggles
    setupSectionToggles();
}

function loadFilterOptions() {
    console.log('📋 Loading filter options...');
    
     const countriesContent = document.getElementById('countries-content');
    if (countriesContent) {
        countriesContent.classList.remove('collapsed');
        countriesContent.style.display = 'block';
    }
    
    fetch('/api/filter-options')
        .then(response => {
            console.log('📋 Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('📋 Full API response:', data);
            console.log('📋 Countries:', data.countries?.length || 0);
            console.log('📋 Products:', data.products?.length || 0);
            
            // Ma'lumotlar bor-yo'qligini tekshirish
            if (data.countries && Array.isArray(data.countries) && data.countries.length > 0) {
                console.log('✅ Countries data valid, populating...');
                populateCountries(data.countries);
            } else {
                console.error('❌ No countries data received');
            }
            
            if (data.products && Array.isArray(data.products) && data.products.length > 0) {
                console.log('✅ Products data valid, populating...');
                populateSeries(data.products);
            } else {
                console.error('❌ No products data received');
            }
            
            // Update available counts
            updateAvailableCounts(data);
        })
        .catch(error => {
            console.error('❌ Filter options loading error:', error);
            showToast('Xatolik', 'Filter ma\'lumotlarini yuklashda xatolik: ' + error.message, 'error');
        });
}

function populateCountries(countries) {
    console.log('🌍 populateCountries called with:', countries?.length || 0, 'countries');
    
    if (!countries || !Array.isArray(countries) || countries.length === 0) {
        console.error('❌ Invalid countries data:', countries);
        return;
    }
    
    const countriesList = document.getElementById('countriesList');
    if (!countriesList) {
        console.error('❌ countriesList element not found!');
        return;
    }
    
    console.log('🌍 countriesList element found:', countriesList);
    console.log('🌍 Sample countries:', countries.slice(0, 3));
    
    let html = '';
    
    countries.forEach((country, index) => {
        if (country && typeof country === 'string' && country.trim()) {
            const cleanCountry = country.trim();
            const itemHtml = `
                <div class="filter-item" data-letter="${cleanCountry.charAt(0).toUpperCase()}">
                    <div class="item-content">
                        <input type="checkbox" 
                               id="country_${index}" 
                               class="item-checkbox country-checkbox" 
                               value="${cleanCountry}"
                               onchange="updateSelectionCounts()">
                        <label for="country_${index}" class="item-label">
                            <i class="fas fa-info-circle item-icon"></i>
                            ${cleanCountry}
                        </label>
                    </div>
                </div>
            `;
            html += itemHtml;
        }
    });
    
    console.log('🌍 Generated HTML length:', html.length);
    console.log('🌍 First 200 chars of HTML:', html.substring(0, 200));
    
    countriesList.innerHTML = html;
    console.log('🌍 HTML set to countriesList');
    
    // Check if HTML was actually inserted
    const insertedItems = countriesList.querySelectorAll('.filter-item');
    console.log('🌍 Inserted items count:', insertedItems.length);
    
    // Modal ham update qiling
    const modalCountriesList = document.getElementById('modalCountriesList');
    if (modalCountriesList) {
        modalCountriesList.innerHTML = html.replace(/country_/g, 'modal_country_');
        console.log('🌍 Modal updated');
    }
    
    console.log(`✅ ${countries.length} ta davlat yuklandi`);
}

function populateSeries(series) {
    console.log('📦 populateSeries called with:', series?.length || 0, 'series');
    
    if (!series || !Array.isArray(series) || series.length === 0) {
        console.error('❌ Invalid series data:', series);
        return;
    }
    
    const seriesList = document.getElementById('seriesList');
    if (!seriesList) {
        console.error('❌ seriesList element not found!');
        return;
    }
    
    console.log('📦 seriesList element found:', seriesList);
    console.log('📦 Sample series:', series.slice(0, 2));
    
    let html = '';
    
    series.forEach((item, index) => {
        if (item && typeof item === 'string' && item.trim()) {
            const cleanItem = item.trim();
            const shortName = cleanItem.length > 80 ? cleanItem.substring(0, 77) + '...' : cleanItem;
            const itemHtml = `
                <div class="filter-item">
                    <div class="item-content">
                        <input type="checkbox" 
                               id="series_${index}" 
                               class="item-checkbox series-checkbox" 
                               value="${cleanItem}"
                               onchange="updateSelectionCounts()">
                        <label for="series_${index}" class="item-label" title="${cleanItem}">
                            <i class="fas fa-info-circle item-icon"></i>
                            ${shortName}
                        </label>
                    </div>
                </div>
            `;
            html += itemHtml;
        }
    });
    
    console.log('📦 Generated HTML length:', html.length);
    
    seriesList.innerHTML = html;
    console.log('📦 HTML set to seriesList');
    
    // Check if HTML was actually inserted
    const insertedItems = seriesList.querySelectorAll('.filter-item');
    console.log('📦 Inserted items count:', insertedItems.length);
    
    // Modal ham update qiling
    const modalSeriesList = document.getElementById('modalSeriesList');
    if (modalSeriesList) {
        modalSeriesList.innerHTML = html.replace(/series_/g, 'modal_series_');
        console.log('📦 Modal updated');
    }
    
    console.log(`✅ ${series.length} ta seriya yuklandi`);
}

function populateSeries(series) {
    const seriesList = document.getElementById('seriesList');
    const modalSeriesList = document.getElementById('modalSeriesList');
    
    let html = '';
    
    series.forEach((item, index) => {
        const shortName = item.length > 80 ? item.substring(0, 77) + '...' : item;
        const itemHtml = `
            <div class="filter-item">
                <div class="item-content">
                    <input type="checkbox" 
                           id="series_${index}" 
                           class="item-checkbox series-checkbox" 
                           value="${item}"
                           onchange="updateSelectionCounts()">
                    <label for="series_${index}" class="item-label" title="${item}">
                        <i class="fas fa-info-circle item-icon"></i>
                        ${shortName}
                    </label>
                </div>
            </div>
        `;
        html += itemHtml;
    });
    
    if (seriesList) {
        seriesList.innerHTML = html;
    }
    
    if (modalSeriesList) {
        modalSeriesList.innerHTML = html.replace(/series_/g, 'modal_series_');
    }
    
    console.log(`✅ ${series.length} ta seriya yuklandi`);
}

function updateAvailableCounts(data) {
    // Update available counts in UI
    const countriesAvailable = document.getElementById('countries-available');
    const seriesAvailable = document.getElementById('series-available');
    const timeAvailable = document.getElementById('time-available');
    
    if (countriesAvailable) countriesAvailable.textContent = (data.countries || []).length;
    if (seriesAvailable) seriesAvailable.textContent = (data.products || []).length;
    if (timeAvailable) timeAvailable.textContent = 12; // 12 months
}

// ==========================================
// SECTION TOGGLES
// ==========================================

function setupSectionToggles() {
    // Countries section open by default
    const countriesContent = document.getElementById('countries-content');
    const countriesHeader = document.querySelector('[onclick="toggleSection(\'countries\')"]');
    
    if (countriesContent && countriesHeader) {
        countriesContent.classList.remove('collapsed');
        countriesHeader.classList.remove('collapsed');
    }
}

function toggleSection(sectionName) {
    console.log(`🔽 Toggling section: ${sectionName}`);
    
    const content = document.getElementById(sectionName + '-content');
    const icon = document.getElementById(sectionName + '-icon');
    const header = document.querySelector(`[onclick="toggleSection('${sectionName}')"]`);
    
    if (!content || !header) return;
    
    // Close other sections
    const allSections = ['countries', 'series', 'time'];
    allSections.forEach(otherSection => {
        if (otherSection !== sectionName) {
            const otherContent = document.getElementById(otherSection + '-content');
            const otherHeader = document.querySelector(`[onclick="toggleSection('${otherSection}')"]`);
            if (otherContent && otherHeader) {
                otherContent.classList.add('collapsed');
                otherHeader.classList.add('collapsed');
            }
        }
    });
    
    // Toggle current section
    const isCollapsed = content.classList.contains('collapsed');
    
    if (isCollapsed) {
        content.classList.remove('collapsed');
        header.classList.remove('collapsed');
    } else {
        content.classList.add('collapsed');
        header.classList.add('collapsed');
    }
}

// ==========================================
// YEARS AND TIME MANAGEMENT
// ==========================================

function generateYearsGrid(count) {
    const yearsGrid = document.getElementById('yearsGrid');
    if (!yearsGrid) return;
    
    const currentYear = new Date().getFullYear();
    let html = '';
    
    for (let i = 0; i < count; i++) {
        const year = currentYear - i;
        html += `
            <div class="year-item">
                <input type="checkbox" 
                       id="year_${year}" 
                       class="year-checkbox" 
                       value="${year}"
                       onchange="selectYear(${year}, this)">
                <label for="year_${year}" class="year-label">${year}</label>
            </div>
        `;
    }
    
    yearsGrid.innerHTML = html;
}

function showYearRange(count) {
    // Remove active from all year buttons
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    generateYearsGrid(count);
}

function selectYear(year, checkbox) {
    console.log(`📅 Year ${year} ${checkbox.checked ? 'selected' : 'deselected'}`);
    
    if (checkbox.checked) {
        if (!selectedYears.includes(year)) {
            selectedYears.push(year);
        }
        showMonthlyData(year);
    } else {
        selectedYears = selectedYears.filter(y => y !== year);
        if (selectedYears.length === 0) {
            hideMonthlyData();
        }
    }
    
    updateSelectionCounts();
}

function showMonthlyData(year) {
    const selectedYearInfo = document.getElementById('selectedYearInfo');
    const monthlyData = document.getElementById('monthlyData');
    const selectedYearText = document.getElementById('selectedYearText');
    
    if (selectedYearInfo) selectedYearInfo.style.display = 'block';
    if (monthlyData) monthlyData.style.display = 'block';
    if (selectedYearText) selectedYearText.textContent = year;
    
    generateMonthlyList(year);
}

function hideMonthlyData() {
    const selectedYearInfo = document.getElementById('selectedYearInfo');
    const monthlyData = document.getElementById('monthlyData');
    
    if (selectedYearInfo) selectedYearInfo.style.display = 'none';
    if (monthlyData) monthlyData.style.display = 'none';
}

function generateMonthlyList(year) {
    const monthlyList = document.getElementById('monthlyList');
    if (!monthlyList) return;
    
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    let html = '';
    
    // Export section
    html += '<div class="time-section"><h4 class="time-section-title">📤 Export Ma\'lumotlari</h4>';
    months.forEach((month, index) => {
        html += `
            <div class="time-item">
                <input type="checkbox" 
                       id="export_${month.toLowerCase()}_${year}" 
                       class="time-checkbox" 
                       value="export_${month.toLowerCase()}"
                       onchange="updateSelectionCounts()">
                <label for="export_${month.toLowerCase()}_${year}" class="time-label">
                    <i class="fas fa-upload time-icon export"></i>
                    Export ${month} ${year}
                </label>
            </div>
        `;
    });
    html += '</div>';
    
    // Import section
    html += '<div class="time-section"><h4 class="time-section-title">📥 Import Ma\'lumotlari</h4>';
    months.forEach((month, index) => {
        html += `
            <div class="time-item">
                <input type="checkbox" 
                       id="import_${month.toLowerCase()}_${year}" 
                       class="time-checkbox" 
                       value="import_${month.toLowerCase()}"
                       onchange="updateSelectionCounts()">
                <label for="import_${month.toLowerCase()}_${year}" class="time-label">
                    <i class="fas fa-download time-icon import"></i>
                    Import ${month} ${year}
                </label>
            </div>
        `;
    });
    html += '</div>';
    
    monthlyList.innerHTML = html;
}

// ==========================================
// SELECTION MANAGEMENT
// ==========================================

function updateSelectionCounts() {
    // Get current selections
    selectedCountries = Array.from(document.querySelectorAll('.country-checkbox:checked')).map(cb => cb.value);
    selectedSeries = Array.from(document.querySelectorAll('.series-checkbox:checked')).map(cb => cb.value);
    selectedTime = Array.from(document.querySelectorAll('.time-checkbox:checked')).map(cb => cb.value);
    
    // Update UI counts
    const countriesSelected = document.getElementById('countries-selected');
    const seriesSelected = document.getElementById('series-selected');
    const timeSelected = document.getElementById('time-selected');
    
    if (countriesSelected) countriesSelected.textContent = selectedCountries.length;
    if (seriesSelected) seriesSelected.textContent = selectedSeries.length;
    if (timeSelected) timeSelected.textContent = selectedTime.length;
    
    // Update preview status
    updatePreviewStatus();
    
    // Update current selections display
    updateCurrentSelections();
    
    // Check for changes
    if (applyChangesClicked) {
        checkForChanges();
    }
    
    console.log('📊 Selections updated:', {
        countries: selectedCountries.length,
        series: selectedSeries.length,
        time: selectedTime.length,
        years: selectedYears.length
    });
}

function updatePreviewStatus() {
    const requirements = [
        { id: 'countries-requirement', count: selectedCountries.length },
        { id: 'series-requirement', count: selectedSeries.length },
        { id: 'time-requirement', count: selectedTime.length }
    ];
    
    requirements.forEach(req => {
        const element = document.getElementById(req.id);
        if (element) {
            const icon = element.querySelector('.requirement-icon');
            if (req.count > 0) {
                icon.className = 'fas fa-check-circle requirement-icon completed';
                element.classList.add('completed');
            } else {
                icon.className = 'fas fa-circle requirement-icon';
                element.classList.remove('completed');
            }
        }
    });
}

function updateCurrentSelections() {
    const currentSelections = document.getElementById('currentSelections');
    const hasSelections = selectedCountries.length > 0 || selectedSeries.length > 0 || selectedTime.length > 0;
    
    if (currentSelections) {
        if (hasSelections) {
            currentSelections.style.display = 'block';
            document.getElementById('currentCountriesCount').textContent = selectedCountries.length;
            document.getElementById('currentSeriesCount').textContent = selectedSeries.length;
            document.getElementById('currentTimeCount').textContent = selectedTime.length;
        } else {
            currentSelections.style.display = 'none';
        }
    }
}

function checkForChanges() {
    const hasChanges = 
        !arraysEqual(selectedCountries, previousSelections.countries) ||
        !arraysEqual(selectedSeries, previousSelections.series) ||
        !arraysEqual(selectedTime, previousSelections.time) ||
        !arraysEqual(selectedYears, previousSelections.years);
    
    const changesReport = document.getElementById('changesReport');
    if (changesReport) {
        if (hasChanges) {
            changesReport.style.display = 'block';
            showPreviewPanel();
        } else {
            changesReport.style.display = 'none';
        }
    }
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => val === b[i]);
}

// ==========================================
// DATA LOADING AND PROCESSING
// ==========================================

function loadInitialData() {
    console.log('📊 Loading initial data...');
    
    fetch('/api/trade-data?limit=100')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentData = data.records || [];
                filteredData = [...currentData];
                
                console.log(`✅ Initial data loaded: ${currentData.length} records`);
                updateStatsDisplay();
            } else {
                console.error('❌ Initial data loading failed:', data.error);
            }
        })
        .catch(error => {
            console.error('❌ Initial data loading error:', error);
        });
}

function loadAnalyticsData() {
    console.log('📈 Loading analytics data...');
    // This will be called when analytics page is shown
    loadFilterOptions();
}

function loadAdminData() {
    console.log('⚙️ Loading admin data...');
    loadStats();
}

// ==========================================
// APPLY CHANGES AND DATA FETCHING
// ==========================================

function applyChanges() {
    console.log('🚀 Applying changes...');
    
    // Validate selections
    if (selectedCountries.length === 0) {
        showToast('Xatolik', 'Kamida bitta davlatni tanlang', 'error');
        return;
    }
    
    if (selectedSeries.length === 0) {
        showToast('Xatolik', 'Kamida bitta seriyani tanlang', 'error');
        return;
    }
    
    if (selectedTime.length === 0) {
        showToast('Xatolik', 'Kamida bitta vaqt oralig\'ini tanlang', 'error');
        return;
    }
    
    // Show loading
    showLoadingOverlay();
    
    // Prepare data for API
    const formData = new FormData();
    selectedCountries.forEach(country => formData.append('countries', country));
    selectedSeries.forEach(series => formData.append('products', series));
    selectedYears.forEach(year => formData.append('years', year));
    
    // Fetch filtered data
    fetch('/api/get-data', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideLoadingOverlay();
        
        if (data.success) {
            currentData = data.data || [];
            filteredData = [...currentData];
            
            // Update previous selections
            previousSelections = {
                countries: [...selectedCountries],
                series: [...selectedSeries],
                time: [...selectedTime],
                years: [...selectedYears]
            };
            
            applyChangesClicked = true;
            
            // Hide preview panel and show table
            hidePreviewPanel();
            showView('table');
            
            // Update all views
            updateAllViews();
            
            showToast('Muvaffaqiyat', `${currentData.length} ta record yuklandi`, 'success');
            
            console.log(`✅ Data applied: ${currentData.length} records`);
        } else {
            showToast('Xatolik', data.error || 'Ma\'lumot yuklashda xatolik', 'error');
        }
    })
    .catch(error => {
        hideLoadingOverlay();
        console.error('❌ Apply changes error:', error);
        showToast('Xatolik', 'Server bilan bog\'lanishda xatolik', 'error');
    });
}

function updateAllViews() {
    // Update table
    if (document.getElementById('tablePanel').style.display !== 'none') {
        generateTable();
    }
    
    // Update chart selector
    updateChartCountrySelector();
    
    // Update stats
    updateStatsDisplay();
}

// ==========================================
// VIEW MANAGEMENT
// ==========================================

function showView(viewName) {
    console.log(`👁️ Showing view: ${viewName}`);
    
    // Check if data is applied
    if (!applyChangesClicked && currentData.length === 0) {
        showPreviewPanel();
        showToast('Ma\'lumot kerak', 'Avval "O\'zgarishlarni qo\'llash" tugmasini bosing', 'warning');
        return;
    }
    
    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    
    // Remove active from all view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected view
    const targetPanel = document.getElementById(viewName + 'Panel');
    if (targetPanel) {
        targetPanel.style.display = 'block';
    }
    
    // Add active to clicked button
    if (event && event.target) {
        const viewBtn = event.target.closest('.view-btn');
        if (viewBtn) {
            viewBtn.classList.add('active');
        }
    }
    
    // View-specific actions
    switch(viewName) {
        case 'table':
            generateTable();
            break;
        case 'chart':
            generateChart();
            break;
        case 'map':
            generateMap();
            break;
        case 'metadata':
            generateMetadata();
            break;
    }
}

function showPreviewPanel() {
    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    
    // Show preview panel
    const previewPanel = document.getElementById('previewPanel');
    if (previewPanel) {
        previewPanel.style.display = 'block';
    }
    
    // Remove active from all view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

function hidePreviewPanel() {
    const previewPanel = document.getElementById('previewPanel');
    if (previewPanel) {
        previewPanel.style.display = 'none';
    }
}

// ==========================================
// TABLE GENERATION
// ==========================================

function generateTable() {
    console.log('📋 Generating table...');
    
    const tableBody = document.getElementById('tableBody');
    const tableHeader = document.getElementById('tableHeader');
    const recordCount = document.getElementById('recordCount');
    
    if (!tableBody || !tableHeader) {
        console.error('❌ Table elements not found');
        return;
    }
    
    if (currentData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100%" class="no-data">Ma\'lumotlar mavjud emas</td></tr>';
        if (recordCount) recordCount.textContent = '0';
        return;
    }
    
    // Generate table headers
    let headerHtml = `
        <th>Davlat</th>
        <th>Mahsulot</th>
        <th>HS Kod</th>
        <th>Yil</th>
        <th>Import Hajmi</th>
        <th>Import Qiymati ($)</th>
        <th>Export Hajmi</th>
        <th>Export Qiymati ($)</th>
    `;
    
    tableHeader.innerHTML = headerHtml;
    
    // Generate table rows
    let bodyHtml = '';
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, currentData.length);
    
    for (let i = startIndex; i < endIndex; i++) {
        const item = currentData[i];
        bodyHtml += `
            <tr>
                <td><strong>${item.country || '-'}</strong></td>
                <td title="${item.product_name || '-'}">${truncateText(item.product_name || '-', 50)}</td>
                <td>${item.hs_code || '-'}</td>
                <td><span class="year-badge">${item.year || '-'}</span></td>
                <td>${formatNumber(item.import_volume || 0)}</td>
                <td>$${formatNumber(item.import_price || 0)}</td>
                <td>${formatNumber(item.export_volume || 0)}</td>
                <td>$${formatNumber(item.export_price || 0)}</td>
            </tr>
        `;
    }
    
    tableBody.innerHTML = bodyHtml;
    
    // Update record count
    if (recordCount) {
        recordCount.textContent = currentData.length.toLocaleString();
    }
    
    // Generate pagination
    generatePagination();
    
    console.log(`✅ Table generated with ${endIndex - startIndex} rows`);
}

function generatePagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(currentData.length / pageSize);
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
                     onclick="changePage(${currentPage - 1})" 
                     ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
             </button>`;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" 
                         onclick="changePage(${i})">${i}</button>`;
    }
    
    // Next button
    html += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                     onclick="changePage(${currentPage + 1})"
                     ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
             </button>`;
    
    pagination.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(currentData.length / pageSize);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        generateTable();
    }
}

// ==========================================
// CHART GENERATION
// ==========================================

function generateChart() {
    console.log('📊 Generating chart...');
    
    updateChartCountrySelector();
    
    if (selectedCountries.length === 0) {
        showChartMessage('Davlat tanlang', 'Grafik ko\'rish uchun davlatni tanlang');
        return;
    }
    
    // Set first country as default
    const chartCountrySelector = document.getElementById('chartCountrySelector');
    if (chartCountrySelector && !chartCountrySelector.value) {
        chartCountrySelector.value = selectedCountries[0];
    }
    
    updateChartForCountry();
}

function updateChartCountrySelector() {
    const selector = document.getElementById('chartCountrySelector');
    if (!selector) return;
    
    selector.innerHTML = '<option value="">Davlatni tanlang...</option>';
    
    selectedCountries.forEach(country => {
        selector.innerHTML += `<option value="${country}">${country}</option>`;
    });
}

function updateChartForCountry() {
    const selectedCountry = document.getElementById('chartCountrySelector')?.value;
    const valueType = document.getElementById('chartValueType')?.value || 'qty';
    
    if (!selectedCountry) {
        showChartMessage('Davlat tanlang', 'Grafik ko\'rish uchun davlatni tanlang');
        return;
    }
    
    const countryData = currentData.filter(item => item.country === selectedCountry);
    
    if (countryData.length === 0) {
        showChartMessage('Ma\'lumot topilmadi', `${selectedCountry} uchun ma'lumot yo'q`);
        return;
    }
    
    // Process data for chart
    const chartData = processChartData(countryData, valueType);
    
    // Create chart
    createChart(chartData, valueType);
}

function processChartData(data, valueType) {
    // Group by year
    const yearData = {};
    
    data.forEach(item => {
        const year = item.year;
        if (!yearData[year]) {
            yearData[year] = { import: 0, export: 0 };
        }
        
        if (valueType === 'qty') {
            yearData[year].import += item.import_volume || 0;
            yearData[year].export += item.export_volume || 0;
        } else {
            yearData[year].import += item.import_price || 0;
            yearData[year].export += item.export_price || 0;
        }
    });
    
    const years = Object.keys(yearData).sort();
    const importData = years.map(year => yearData[year].import);
    const exportData = years.map(year => yearData[year].export);
    
    return {
        labels: years,
       datasets: [
           {
               label: 'Import',
               data: importData,
               borderColor: '#e74c3c',
               backgroundColor: 'rgba(231, 76, 60, 0.1)',
               tension: 0.4,
               fill: true
           },
           {
               label: 'Export',
               data: exportData,
               borderColor: '#27ae60',
               backgroundColor: 'rgba(39, 174, 96, 0.1)',
               tension: 0.4,
               fill: true
           }
       ]
   };
}

function createChart(data, valueType) {
   const ctx = document.getElementById('mainChart');
   if (!ctx) return;
   
   // Destroy existing chart
   if (chart) {
       chart.destroy();
   }
   
   const unit = valueType === 'qty' ? 'dona' : '$';
   
   chart = new Chart(ctx, {
       type: 'line',
       data: data,
       options: {
           responsive: true,
           maintainAspectRatio: false,
           plugins: {
               title: {
                   display: true,
                   text: `Import va Export tendentsiyasi (${unit})`,
                   font: { size: 16, weight: 'bold' }
               },
               legend: {
                   position: 'top'
               },
               tooltip: {
                   callbacks: {
                       label: function(context) {
                           const value = formatNumber(context.parsed.y);
                           return `${context.dataset.label}: ${value} ${unit}`;
                       }
                   }
               }
           },
           scales: {
               y: {
                   beginAtZero: true,
                   title: {
                       display: true,
                       text: `Qiymat (${unit})`
                   },
                   ticks: {
                       callback: function(value) {
                           return formatNumber(value) + ' ' + unit;
                       }
                   }
               },
               x: {
                   title: {
                       display: true,
                       text: 'Yillar'
                   }
               }
           }
       }
   });
   
   console.log('✅ Chart created successfully');
}

function showChartMessage(title, message) {
   const ctx = document.getElementById('mainChart');
   if (!ctx) return;
   
   if (chart) {
       chart.destroy();
       chart = null;
   }
   
   // Show message in chart area
   const chartContainer = ctx.parentElement;
   chartContainer.innerHTML = `
       <div class="chart-message">
           <i class="fas fa-chart-line fa-3x"></i>
           <h4>${title}</h4>
           <p>${message}</p>
       </div>
       <canvas id="mainChart"></canvas>
   `;
}

function changeChartType(type) {
   // Update active button
   document.querySelectorAll('.chart-type-btn').forEach(btn => {
       btn.classList.remove('active');
   });
   event.target.closest('.chart-type-btn').classList.add('active');
   
   // Recreate chart with new type
   if (chart && chart.data) {
       const currentData = chart.data;
       chart.destroy();
       
       const valueType = document.getElementById('chartValueType')?.value || 'qty';
       
       chart = new Chart(document.getElementById('mainChart'), {
           type: type,
           data: currentData,
           options: chart.options // Reuse existing options
       });
   }
}

function exportChart() {
   if (!chart) {
       showToast('Xatolik', 'Avval grafikni yarating', 'error');
       return;
   }
   
   try {
       const url = chart.toBase64Image('image/png', 1);
       const a = document.createElement('a');
       a.href = url;
       a.download = `chart_${new Date().toISOString().slice(0, 10)}.png`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       
       showToast('Muvaffaqiyat', 'Grafik PNG formatida yuklandi', 'success');
   } catch (error) {
       console.error('Chart export error:', error);
       showToast('Xatolik', 'Grafik eksport qilishda xatolik', 'error');
   }
}

function expandChart() {
   if (!chart) {
       showToast('Xatolik', 'Avval grafikni yarating', 'error');
       return;
   }
   
   // Create modal for expanded chart
   const modal = document.createElement('div');
   modal.className = 'chart-modal';
   modal.innerHTML = `
       <div class="chart-modal-content">
           <div class="chart-modal-header">
               <h3>Kengaytirilgan Grafik</h3>
               <button class="modal-close" onclick="closeChartModal()">&times;</button>
           </div>
           <div class="chart-modal-body">
               <canvas id="expandedChart"></canvas>
           </div>
       </div>
   `;
   
   document.body.appendChild(modal);
   
   // Create expanded chart
   setTimeout(() => {
       const expandedCtx = document.getElementById('expandedChart');
       if (expandedCtx) {
           new Chart(expandedCtx, {
               type: chart.config.type,
               data: chart.data,
               options: {
                   ...chart.options,
                   responsive: true,
                   maintainAspectRatio: false
               }
           });
       }
   }, 100);
   
   // Add close function to global scope
   window.closeChartModal = function() {
       document.body.removeChild(modal);
       delete window.closeChartModal;
   };
}

// ==========================================
// MAP GENERATION
// ==========================================

function generateMap() {
   console.log('🗺️ Generating map...');
   
   const mapContainer = document.getElementById('mapContainer');
   if (!mapContainer) return;
   
   // Simple map placeholder for now
   mapContainer.innerHTML = `
       <div class="map-placeholder">
           <i class="fas fa-globe fa-4x"></i>
           <h3>Xarita ko'rinish</h3>
           <p>Geografik vizualizatsiya tez orada qo'shiladi</p>
           <div class="map-stats">
               <div class="map-stat">
                   <strong>${selectedCountries.length}</strong>
                   <span>Tanlangan davlatlar</span>
               </div>
               <div class="map-stat">
                   <strong>${currentData.length}</strong>
                   <span>Ma'lumotlar</span>
               </div>
           </div>
       </div>
   `;
}

function exportMapData() {
   showToast('Export', 'Xarita ma\'lumotlari eksport qilish tez orada qo\'shiladi', 'info');
}

function exportMapImage() {
   showToast('Export', 'Xarita rasm eksport qilish tez orada qo\'shiladi', 'info');
}

// ==========================================
// METADATA GENERATION
// ==========================================

function generateMetadata() {
   console.log('📄 Generating metadata...');
   
   const metadataContent = document.getElementById('metadataContent');
   if (!metadataContent) return;
   
   // Calculate statistics
   const totalImportValue = currentData.reduce((sum, item) => sum + (item.import_price || 0), 0);
   const totalExportValue = currentData.reduce((sum, item) => sum + (item.export_price || 0), 0);
   const uniqueCountries = [...new Set(currentData.map(item => item.country))];
   const uniqueProducts = [...new Set(currentData.map(item => item.product_name))];
   
   metadataContent.innerHTML = `
       <div class="metadata-grid">
           <!-- Summary Cards -->
           <div class="metadata-section">
               <h4>📊 Umumiy Statistika</h4>
               <div class="stats-cards">
                   <div class="stat-card primary">
                       <div class="stat-value">${selectedCountries.length}</div>
                       <div class="stat-label">Tanlangan Davlatlar</div>
                   </div>
                   <div class="stat-card success">
                       <div class="stat-value">${selectedSeries.length}</div>
                       <div class="stat-label">Tanlangan Seriyalar</div>
                   </div>
                   <div class="stat-card info">
                       <div class="stat-value">${selectedTime.length}</div>
                       <div class="stat-label">Tanlangan Vaqt</div>
                   </div>
                   <div class="stat-card warning">
                       <div class="stat-value">${currentData.length}</div>
                       <div class="stat-label">Jami Ma'lumotlar</div>
                   </div>
               </div>
           </div>
           
           <!-- Financial Summary -->
           <div class="metadata-section">
               <h4>💰 Moliyaviy Xulosalar</h4>
               <div class="financial-stats">
                   <div class="financial-item">
                       <span class="financial-label">Jami Import Qiymati:</span>
                       <span class="financial-value import">$${formatNumber(totalImportValue)}</span>
                   </div>
                   <div class="financial-item">
                       <span class="financial-label">Jami Export Qiymati:</span>
                       <span class="financial-value export">$${formatNumber(totalExportValue)}</span>
                   </div>
                   <div class="financial-item">
                       <span class="financial-label">Savdo Balansi:</span>
                       <span class="financial-value ${totalExportValue > totalImportValue ? 'positive' : 'negative'}">
                           $${formatNumber(totalExportValue - totalImportValue)}
                       </span>
                   </div>
               </div>
           </div>
           
           <!-- Selected Items -->
           <div class="metadata-section">
               <h4>📋 Tanlangan Elementlar</h4>
               <div class="selected-items">
                   <div class="selected-group">
                       <h5>🌍 Davlatlar (${selectedCountries.length})</h5>
                       <div class="selected-list">
                           ${selectedCountries.slice(0, 10).map(country => 
                               `<span class="selected-tag">${country}</span>`
                           ).join('')}
                           ${selectedCountries.length > 10 ? `<span class="more-tag">+${selectedCountries.length - 10} ta ko'proq</span>` : ''}
                       </div>
                   </div>
                   
                   <div class="selected-group">
                       <h5>📦 Seriyalar (${selectedSeries.length})</h5>
                       <div class="selected-list">
                           ${selectedSeries.slice(0, 5).map(series => 
                               `<span class="selected-tag" title="${series}">${truncateText(series, 30)}</span>`
                           ).join('')}
                           ${selectedSeries.length > 5 ? `<span class="more-tag">+${selectedSeries.length - 5} ta ko'proq</span>` : ''}
                       </div>
                   </div>
                   
                   <div class="selected-group">
                       <h5>📅 Vaqt Davrlari (${selectedTime.length})</h5>
                       <div class="selected-list">
                           ${selectedTime.slice(0, 8).map(time => 
                               `<span class="selected-tag time">${formatTimePeriod(time)}</span>`
                           ).join('')}
                           ${selectedTime.length > 8 ? `<span class="more-tag">+${selectedTime.length - 8} ta ko'proq</span>` : ''}
                       </div>
                   </div>
               </div>
           </div>
           
           <!-- Data Quality -->
           <div class="metadata-section">
               <h4>🔍 Ma'lumotlar Sifati</h4>
               <div class="data-quality">
                   <div class="quality-item">
                       <span class="quality-label">Noyob Davlatlar:</span>
                       <span class="quality-value">${uniqueCountries.length}</span>
                   </div>
                   <div class="quality-item">
                       <span class="quality-label">Noyob Mahsulotlar:</span>
                       <span class="quality-value">${uniqueProducts.length}</span>
                   </div>
                   <div class="quality-item">
                       <span class="quality-label">To'liq Ma'lumot:</span>
                       <span class="quality-value">${Math.round((currentData.filter(item => 
                           item.import_price > 0 || item.export_price > 0
                       ).length / currentData.length) * 100)}%</span>
                   </div>
               </div>
           </div>
       </div>
   `;
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

function exportCurrentView() {
   const activeView = document.querySelector('.view-btn.active');
   if (!activeView) {
       showToast('Xatolik', 'Faol ko\'rinish topilmadi', 'error');
       return;
   }
   
   const viewText = activeView.textContent.trim();
   
   if (viewText.includes('Jadval')) {
       exportTable('csv');
   } else if (viewText.includes('Grafik')) {
       exportChart();
   } else {
       showToast('Export', `${viewText} eksport qilish tez orada qo'shiladi`, 'info');
   }
}

function exportTable(format) {
   if (currentData.length === 0) {
       showToast('Xatolik', 'Eksport qilish uchun ma\'lumot yo\'q', 'error');
       return;
   }
   
   if (format === 'csv') {
       exportTableAsCSV();
   } else if (format === 'excel') {
       showToast('Excel Export', 'Excel eksport tez orada qo\'shiladi', 'info');
   }
}

function exportTableAsCSV() {
   let csv = 'Davlat,Mahsulot,HS Kod,Yil,Import Hajmi,Import Qiymati ($),Export Hajmi,Export Qiymati ($)\n';
   
   currentData.forEach(item => {
       csv += `"${item.country || ''}","${item.product_name || ''}","${item.hs_code || ''}",${item.year || ''},${item.import_volume || 0},${item.import_price || 0},${item.export_volume || 0},${item.export_price || 0}\n`;
   });
   
   const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
   const url = window.URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = `trade_data_${new Date().toISOString().slice(0, 10)}.csv`;
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   window.URL.revokeObjectURL(url);
   
   showToast('Export', 'Ma\'lumotlar CSV formatida yuklandi', 'success');
}

function exportAllData() {
   if (currentData.length === 0) {
       showToast('Xatolik', 'Eksport qilish uchun ma\'lumot yo\'q', 'error');
       return;
   }
   
   const format = prompt('Format tanlang: csv yoki json', 'csv');
   
   if (format === 'csv') {
       exportTableAsCSV();
   } else if (format === 'json') {
       const jsonData = JSON.stringify(currentData, null, 2);
       const blob = new Blob([jsonData], { type: 'application/json' });
       const url = window.URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `trade_data_${new Date().toISOString().slice(0, 10)}.json`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       window.URL.revokeObjectURL(url);
       
       showToast('Export', 'Ma\'lumotlar JSON formatida yuklandi', 'success');
   }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatNumber(num) {
   if (!num || num === 0) return '0';
   return new Intl.NumberFormat('en-US').format(Math.round(num));
}

function truncateText(text, length) {
   if (!text) return '-';
   return text.length > length ? text.substring(0, length) + '...' : text;
}

function formatTimePeriod(timePeriod) {
   return timePeriod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ==========================================
// SEARCH AND FILTER FUNCTIONS
// ==========================================

function setupEventListeners() {
   // Search functionality
   const countrySearch = document.getElementById('countrySearch');
   if (countrySearch) {
       countrySearch.addEventListener('input', function(e) {
           filterItems('.country-checkbox', e.target.value);
       });
   }
   
   const seriesSearch = document.getElementById('seriesSearch');
   if (seriesSearch) {
       seriesSearch.addEventListener('input', function(e) {
           filterItems('.series-checkbox', e.target.value);
       });
   }
   
   // Select all functionality
   const selectAllCountries = document.getElementById('selectAllCountries');
   if (selectAllCountries) {
       selectAllCountries.addEventListener('change', function(e) {
           const checkboxes = document.querySelectorAll('.country-checkbox');
           checkboxes.forEach(cb => cb.checked = e.target.checked);
           updateSelectionCounts();
       });
   }
   
   const selectAllSeries = document.getElementById('selectAllSeries');
   if (selectAllSeries) {
       selectAllSeries.addEventListener('change', function(e) {
           const checkboxes = document.querySelectorAll('.series-checkbox');
           checkboxes.forEach(cb => cb.checked = e.target.checked);
           updateSelectionCounts();
       });
   }
   
   const selectAllMonthly = document.getElementById('selectAllMonthly');
   if (selectAllMonthly) {
       selectAllMonthly.addEventListener('change', function(e) {
           const checkboxes = document.querySelectorAll('.time-checkbox');
           checkboxes.forEach(cb => cb.checked = e.target.checked);
           updateSelectionCounts();
       });
   }
   
   // Chart country selector
   const chartCountrySelector = document.getElementById('chartCountrySelector');
   if (chartCountrySelector) {
       chartCountrySelector.addEventListener('change', updateChartForCountry);
   }
   
   const chartValueType = document.getElementById('chartValueType');
   if (chartValueType) {
       chartValueType.addEventListener('change', updateChartForCountry);
   }
}

function filterItems(selector, searchTerm) {
   const checkboxes = document.querySelectorAll(selector);
   searchTerm = searchTerm.toLowerCase();
   
   checkboxes.forEach(checkbox => {
       const label = checkbox.nextElementSibling;
       const text = label.textContent.toLowerCase();
       const item = checkbox.closest('.filter-item');
       
       if (text.includes(searchTerm)) {
           item.style.display = 'block';
       } else {
           item.style.display = 'none';
       }
   });
}

function filterCountriesByLetter(letter) {
   // Remove active from all alphabet buttons
   document.querySelectorAll('.alphabet-btn').forEach(btn => {
       btn.classList.remove('active');
   });
   
   // Add active to clicked button
   if (event && event.target) {
       event.target.classList.add('active');
   }
   
   const items = document.querySelectorAll('#countriesList .filter-item');
   
   if (letter === 'all') {
       items.forEach(item => item.style.display = 'block');
   } else {
       items.forEach(item => {
           const itemLetter = item.getAttribute('data-letter');
           if (itemLetter === letter) {
               item.style.display = 'block';
           } else {
               item.style.display = 'none';
           }
       });
   }
}

// ==========================================
// CLEAR FUNCTIONS
// ==========================================

function clearAllCountries() {
   document.querySelectorAll('.country-checkbox').forEach(cb => cb.checked = false);
   document.getElementById('selectAllCountries').checked = false;
   updateSelectionCounts();
}

function clearAllSeries() {
   document.querySelectorAll('.series-checkbox').forEach(cb => cb.checked = false);
   document.getElementById('selectAllSeries').checked = false;
   updateSelectionCounts();
}

function clearAllMonthly() {
   document.querySelectorAll('.time-checkbox').forEach(cb => cb.checked = false);
   document.getElementById('selectAllMonthly').checked = false;
   updateSelectionCounts();
}

function sortCountries() {
   showToast('Saralash', 'Saralash funksiyasi tez orada qo\'shiladi', 'info');
}

function sortSeries() {
   showToast('Saralash', 'Saralash funksiyasi tez orada qo\'shiladi', 'info');
}

function resetAllSelections() {
   // Clear all checkboxes
   document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
   
   // Reset variables
   selectedCountries = [];
   selectedSeries = [];
   selectedTime = [];
   selectedYears = [];
   currentData = [];
   filteredData = [];
   applyChangesClicked = false;
   
   // Reset UI
   updateSelectionCounts();
   hideMonthlyData();
   showPreviewPanel();
   
   // Destroy chart
   if (chart) {
       chart.destroy();
       chart = null;
   }
   
   showToast('Reset', 'Barcha tanlovlar tozalandi', 'info');
}

// ==========================================
// MODAL FUNCTIONS
// ==========================================

function openCountriesModal() {
   const modal = document.getElementById('countriesModal');
   if (modal) {
       modal.style.display = 'flex';
       updateModalCountryCount();
   }
}

function openSeriesModal() {
   const modal = document.getElementById('seriesModal');
   if (modal) {
       modal.style.display = 'flex';
       updateModalSeriesCount();
   }
}

function closeModal(modalId) {
   const modal = document.getElementById(modalId);
   if (modal) {
       modal.style.display = 'none';
   }
}

function selectAllCountriesModal() {
   document.querySelectorAll('.modal-country-checkbox').forEach(cb => cb.checked = true);
   updateModalCountryCount();
}

function clearAllCountriesModal() {
   document.querySelectorAll('.modal-country-checkbox').forEach(cb => cb.checked = false);
   updateModalCountryCount();
}

function selectAllSeriesModal() {
   document.querySelectorAll('.modal-series-checkbox').forEach(cb => cb.checked = true);
   updateModalSeriesCount();
}

function clearAllSeriesModal() {
   document.querySelectorAll('.modal-series-checkbox').forEach(cb => cb.checked = false);
   updateModalSeriesCount();
}

function updateModalCountryCount() {
   const count = document.querySelectorAll('.modal-country-checkbox:checked').length;
   const countElement = document.getElementById('modalCountryCount');
   if (countElement) countElement.textContent = count;
}

function updateModalSeriesCount() {
   const count = document.querySelectorAll('.modal-series-checkbox:checked').length;
   const countElement = document.getElementById('modalSeriesCount');
   if (countElement) countElement.textContent = count;
}

function applyCountrySelection() {
   // Clear main checkboxes
   document.querySelectorAll('.country-checkbox').forEach(cb => cb.checked = false);
   
   // Apply modal selections
   document.querySelectorAll('.modal-country-checkbox:checked').forEach(modalCb => {
       const value = modalCb.value;
       const mainCb = document.querySelector(`.country-checkbox[value="${value}"]`);
       if (mainCb) mainCb.checked = true;
   });
   
   updateSelectionCounts();
   closeModal('countriesModal');
}

function applySeriesSelection() {
   // Clear main checkboxes
   document.querySelectorAll('.series-checkbox').forEach(cb => cb.checked = false);
   
   // Apply modal selections
   document.querySelectorAll('.modal-series-checkbox:checked').forEach(modalCb => {
       const value = modalCb.value;
       const mainCb = document.querySelector(`.series-checkbox[value="${value}"]`);
       if (mainCb) mainCb.checked = true;
   });
   
   updateSelectionCounts();
   closeModal('seriesModal');
}

// ==========================================
// ADMIN FUNCTIONS
// ==========================================

function setupFileUpload() {
   const uploadArea = document.getElementById('uploadArea');
   const fileInput = document.getElementById('fileInput');
   
   if (!uploadArea || !fileInput) return;
   
   // Drag and drop
   uploadArea.addEventListener('dragover', (e) => {
       e.preventDefault();
       uploadArea.classList.add('dragover');
   });
   
   uploadArea.addEventListener('dragleave', () => {
       uploadArea.classList.remove('dragover');
   });
   
   uploadArea.addEventListener('drop', (e) => {
       e.preventDefault();
       uploadArea.classList.remove('dragover');
       const files = e.dataTransfer.files;
       if (files.length > 0) {
           handleFileUpload(files[0]);
       }
   });
   
   fileInput.addEventListener('change', (e) => {
       if (e.target.files.length > 0) {
           handleFileUpload(e.target.files[0]);
       }
   });
}

function handleFileUpload(file) {
   console.log('📁 File upload started:', file.name);
   
   // Show file info
   const fileInfo = document.getElementById('fileInfo');
   if (fileInfo) {
       fileInfo.innerHTML = `
           <strong>Tanlangan fayl:</strong> ${file.name}<br>
           <strong>Hajm:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB<br>
           <strong>Turi:</strong> ${file.type}
       `;
       fileInfo.style.display = 'block';
   }
   
   // Validate file
   if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
       showResult('Faqat Excel fayl (.xlsx, .xls) yuklash mumkin!', 'error');
       return;
   }
   
   if (file.size > 100 * 1024 * 1024) {
       showResult('Fayl hajmi 100MB dan oshmasligi kerak!', 'error');
       return;
   }
   
   uploadFile(file);
}

async function uploadFile(file) {
   const formData = new FormData();
   formData.append('file', file);
   
   const progressSection = document.getElementById('progressSection');
   const progressFill = document.getElementById('progressFill');
   const progressText = document.getElementById('progressText');
   
   if (progressSection) {
       progressSection.style.display = 'block';
       progressFill.style.width = '0%';
       progressText.textContent = 'Yuklanmoqda...';
   }
   
   try {
       const response = await fetch('/upload-excel', {
           method: 'POST',
           body: formData
       });
       
       const data = await response.json();
       
       if (progressSection) {
           progressSection.style.display = 'none';
       }
       
       if (data.success) {
           showResult(data.message, 'success');
           loadStats(); // Refresh stats
           
           // Refresh filter options
           setTimeout(() => {
               loadFilterOptions();
           }, 1000);
       } else {
           showResult(`Xatolik: ${data.error}`, 'error');
       }
       
   } catch (error) {
       if (progressSection) {
           progressSection.style.display = 'none';
       }
       showResult(`Tarmoq xatoligi: ${error.message}`, 'error');
   }
}

function showResult(message, type) {
   const resultSection = document.getElementById('resultSection');
   if (resultSection) {
       resultSection.innerHTML = `<div class="result ${type}">${message}</div>`;
       resultSection.style.display = 'block';
   }
}

function loadStats() {
   fetch('/stats')
       .then(response => response.json())
       .then(data => {
           const adminStats = document.getElementById('adminStats');
           const adminStatsContent = document.getElementById('adminStatsContent');
           
           if (adminStatsContent) {
               let statsHtml = `
                   <div class="admin-stat-item">
                       <span><strong>Jami ma'lumotlar:</strong></span>
                       <span>${data.total_records?.toLocaleString() || 0}</span>
                   </div>
                   <div class="admin-stat-item">
                       <span><strong>Jami Import qiymati:</strong></span>
                       <span>$${data.total_import_value?.toLocaleString() || 0}</span>
                   </div>
                   <div class="admin-stat-item">
                       <span><strong>Jami Export qiymati:</strong></span>
                       <span>$${data.total_export_value?.toLocaleString() || 0}</span>
                   </div>
               `;
               
               adminStatsContent.innerHTML = statsHtml;
           }
           
           if (adminStats) {
               adminStats.style.display = 'block';
           }
       })
       .catch(error => {
           console.error('Stats loading error:', error);
       });
}

function clearAllData() {
    if (!confirm('Barcha ma\'lumotlarni o\'chirishni xohlaysizmi? Bu harakat qaytarib bo\'lmaydi!')) {
        return;
    }
    
    fetch('/clear-data', { method: 'DELETE' })
        .then(response => response.json())  // ✅ json() to'liq yozilgan
        .then(data => {
            if (data.success) {
                showToast('Muvaffaqiyat', data.message, 'success');
                loadStats();
                
                // Reset all data
                currentData = [];
                filteredData = [];
                resetAllSelections();
                
                // Refresh filter options
                setTimeout(() => {
                    loadFilterOptions();
                }, 1000);
            } else {
                showToast('Xatolik', data.error || 'Ma\'lumotlarni o\'chirishda xatolik', 'error');
            }
        })
        .catch(error => {
            console.error('Clear data error:', error);
            showToast('Xatolik', 'Server bilan bog\'lanishda xatolik', 'error');
        });
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

function showToast(title, message, type = 'info') {
   const toastContainer = document.getElementById('toastContainer');
   if (!toastContainer) return;
   
   const toast = document.createElement('div');
   toast.className = `toast toast-${type}`;
   
   let icon = 'fas fa-info-circle';
   switch(type) {
       case 'success':
           icon = 'fas fa-check-circle';
           break;
       case 'error':
           icon = 'fas fa-exclamation-circle';
           break;
       case 'warning':
           icon = 'fas fa-exclamation-triangle';
           break;
   }
   
   toast.innerHTML = `
       <div class="toast-content">
           <div class="toast-icon">
               <i class="${icon}"></i>
           </div>
           <div class="toast-text">
               <div class="toast-title">${title}</div>
               <div class="toast-message">${message}</div>
           </div>
           <button class="toast-close" onclick="closeToast(this)">
               <i class="fas fa-times"></i>
           </button>
       </div>
   `;
   
   toastContainer.appendChild(toast);
   
   // Auto remove after 5 seconds
   setTimeout(() => {
       if (toast.parentElement) {
           removeToast(toast);
       }
   }, 5000);
   
   // Animate in
   setTimeout(() => {
       toast.classList.add('show');
   }, 100);
}

function closeToast(button) {
   const toast = button.closest('.toast');
   removeToast(toast);
}

function removeToast(toast) {
   toast.classList.add('hide');
   setTimeout(() => {
       if (toast.parentElement) {
           toast.parentElement.removeChild(toast);
       }
   }, 300);
}

// ==========================================
// LOADING OVERLAY
// ==========================================

function showLoadingOverlay() {
   const overlay = document.getElementById('loadingOverlay');
   if (overlay) {
       overlay.style.display = 'flex';
   }
}

function hideLoadingOverlay() {
   const overlay = document.getElementById('loadingOverlay');
   if (overlay) {
       overlay.style.display = 'none';
   }
}

// ==========================================
// HELPER AND INFO FUNCTIONS
// ==========================================

function showStats() {
   showPage('analytics');
   
   if (currentData.length === 0) {
       showToast('Ma\'lumot', 'Avval ma\'lumotlarni yuklang', 'info');
       return;
   }
   
   generateMetadata();
   showView('metadata');
}

function showHelp() {
   const helpContent = `
       <div class="help-content">
           <h3>🚀 IMRS Dashboard Yordam</h3>
           
           <div class="help-section">
               <h4>📋 Asosiy Funksiyalar:</h4>
               <ul>
                   <li><strong>O'zgaruvchilar:</strong> Davlatlar, Seriyalar va Vaqtni tanlang</li>
                   <li><strong>Ma'lumot yuklash:</strong> Excel fayllarni import qiling</li>
                   <li><strong>Ko'rinishlar:</strong> Jadval, Grafik, Xarita va Ma'lumot</li>
                   <li><strong>Export:</strong> Ma'lumotlarni CSV/Excel formatida yuklang</li>
               </ul>
           </div>
           
           <div class="help-section">
               <h4>⌨️ Klaviatura Yorliqlari:</h4>
               <ul>
                   <li><strong>Ctrl + Enter:</strong> O'zgarishlarni qo'llash</li>
                   <li><strong>Ctrl + 1-4:</strong> Ko'rinishlar orasida almashtirish</li>
                   <li><strong>Ctrl + S:</strong> Export qilish</li>
               </ul>
           </div>
           
           <div class="help-section">
               <h4>💡 Maslahatlar:</h4>
               <ul>
                   <li>Filtrlash uchun qidiruv maydonlaridan foydalaning</li>
                   <li>Modal oynalardan katta ro'yxatlar bilan ishlang</li>
                   <li>Grafikni kengaytirish uchun "Kengaytirish" tugmasini bosing</li>
                   <li>Barcha ma'lumotlarni eksport qilish uchun yuqoridagi tugmani ishlating</li>
               </ul>
           </div>
       </div>
   `;
   
   const modal = document.createElement('div');
   modal.className = 'help-modal';
   modal.innerHTML = `
       <div class="help-modal-content">
           <div class="help-modal-header">
               <h3>Yordam</h3>
               <button class="modal-close" onclick="closeHelpModal()">&times;</button>
           </div>
           <div class="help-modal-body">
               ${helpContent}
           </div>
           <div class="help-modal-footer">
               <button class="btn btn-primary" onclick="closeHelpModal()">Yopish</button>
           </div>
       </div>
   `;
   
   document.body.appendChild(modal);
   
   // Add close function
   window.closeHelpModal = function() {
       document.body.removeChild(modal);
       delete window.closeHelpModal;
   };
}

function showInfo() {
   showToast('Ma\'lumot', 'IMRS Ma\'lumotlar Bazasi Tizimi - Savdo ma\'lumotlarini tahlil qilish uchun', 'info');
}

function updateStatsDisplay() {
   // This function can be called to update various statistics displays
   console.log('📊 Stats display updated');
}

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================

document.addEventListener('keydown', function(e) {
   // Ctrl+Enter to apply changes
   if (e.ctrlKey && e.key === 'Enter') {
       e.preventDefault();
       applyChanges();
   }
   
   // Ctrl+1,2,3,4 to switch views
   if (e.ctrlKey && ['1', '2', '3', '4'].includes(e.key)) {
       e.preventDefault();
       const viewButtons = document.querySelectorAll('.view-btn');
       const index = parseInt(e.key) - 1;
       if (viewButtons[index]) {
           viewButtons[index].click();
       }
   }
   
   // Ctrl+S to export
   if (e.ctrlKey && e.key === 's') {
       e.preventDefault();
       exportCurrentView();
   }
   
   // Escape to close modals
   if (e.key === 'Escape') {
       const modals = document.querySelectorAll('.modal, .help-modal, .chart-modal');
       modals.forEach(modal => {
           if (modal.style.display !== 'none') {
               modal.style.display = 'none';
           }
       });
   }
});

// ==========================================
// RESPONSIVE BEHAVIOR
// ==========================================

window.addEventListener('resize', function() {
   // Resize chart if visible
   if (chart && document.getElementById('chartPanel').style.display !== 'none') {
       chart.resize();
   }
   
   // Responsive table adjustments
   adjustTableResponsiveness();
});

function adjustTableResponsiveness() {
   const table = document.getElementById('dataTable');
   const container = table?.closest('.table-container');
   
   if (!table || !container) return;
   
   if (window.innerWidth < 768) {
       container.style.overflowX = 'auto';
       table.style.minWidth = '800px';
   } else {
       container.style.overflowX = 'visible';
       table.style.minWidth = 'auto';
   }
}

// ==========================================
// ERROR HANDLING
// ==========================================

window.addEventListener('error', function(e) {
   console.error('JavaScript Error:', e.error);
   showToast('Xatolik', 'Tizimda xatolik yuz berdi. Sahifani yangilab ko\'ring.', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
   console.error('Unhandled Promise Rejection:', e.reason);
   showToast('Xatolik', 'Ma\'lumot yuklashda xatolik. Qayta urinib ko\'ring.', 'error');
});

// ==========================================
// DEBUG FUNCTIONS (Development only)
// ==========================================

window.debugDashboard = function() {
   console.log('=== DASHBOARD DEBUG INFO ===');
   console.log('Current Data:', currentData.length);
   console.log('Selected Countries:', selectedCountries);
   console.log('Selected Series:', selectedSeries);
   console.log('Selected Time:', selectedTime);
   console.log('Selected Years:', selectedYears);
   console.log('Apply Changes Clicked:', applyChangesClicked);
   console.log('Chart:', chart);
   console.log('=== END DEBUG INFO ===');
};

// Quick test function
window.selectSampleData = function() {
   // Select first 3 countries if available
   const countryCheckboxes = document.querySelectorAll('.country-checkbox');
   for (let i = 0; i < Math.min(3, countryCheckboxes.length); i++) {
       countryCheckboxes[i].checked = true;
   }
   
   // Select first 2 series if available  
   const seriesCheckboxes = document.querySelectorAll('.series-checkbox');
   for (let i = 0; i < Math.min(2, seriesCheckboxes.length); i++) {
       seriesCheckboxes[i].checked = true;
   }
   
   // Select first year
   const yearCheckboxes = document.querySelectorAll('.year-checkbox');
   if (yearCheckboxes.length > 0) {
       yearCheckboxes[0].checked = true;
       const year = yearCheckboxes[0].value;
       selectYear(year, yearCheckboxes[0]);
   }
   
   // Select first few time periods
   setTimeout(() => {
       const timeCheckboxes = document.querySelectorAll('.time-checkbox');
       for (let i = 0; i < Math.min(4, timeCheckboxes.length); i++) {
           timeCheckboxes[i].checked = true;
       }
       
       updateSelectionCounts();
       showToast('Test', 'Namunaviy ma\'lumotlar tanlandi!', 'success');
   }, 500);
};

// ==========================================
// PERFORMANCE MONITORING
// ==========================================

function measurePerformance(label, fn) {
   const startTime = performance.now();
   const result = fn();
   const endTime = performance.now();
   console.log(`⏱️ ${label}: ${(endTime - startTime).toFixed(2)}ms`);
   return result;
}

// ==========================================
// INITIALIZATION COMPLETE
// ==========================================

console.log('%c🎯 IMRS Dashboard JavaScript Yuklandi', 'color: #007bff; font-size: 16px; font-weight: bold;');
console.log('%c✅ Barcha funksiyalar faol', 'color: #28a745; font-size: 12px;');
console.log('%c🔧 Debug: debugDashboard(), selectSampleData()', 'color: #6c757d; font-size: 10px;');

// Auto-load data on page load
if (document.readyState === 'loading') {
   document.addEventListener('DOMContentLoaded', function() {
       setTimeout(() => {
           console.log('🚀 Auto-loading initial data...');
       }, 1000);
   });
}

