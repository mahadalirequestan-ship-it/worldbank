// Admin panel JavaScript

// Page navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    
    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageId + '-page').style.display = 'block';
    
    // Add active class to clicked nav item
    event.target.closest('.nav-item').classList.add('active');
    
    if (pageId === 'analytics') {
        loadAnalytics();
    } else if (pageId === 'import') {
        loadStats();
    }
}

// File upload setup
function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const progress = document.getElementById('progress');
    const progressFill = document.getElementById('progressFill');
    const result = document.getElementById('result');

    // Drag & Drop
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
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        // File info display
        fileInfo.innerHTML = `
            <strong>Tanlangan fayl:</strong> ${file.name}<br>
            <strong>Hajm:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB<br>
            <strong>Turi:</strong> ${file.type}
        `;
        fileInfo.style.display = 'block';

        // Validation
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

        progress.style.display = 'block';
        result.style.display = 'none';
        
        try {
            const response = await fetch('/upload-excel', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showResult(data.message, 'success');
                loadStats(); // Refresh stats
            } else {
                showResult(`Xatolik: ${data.error}`, 'error');
            }

        } catch (error) {
            showResult(`Tarmoq xatoligi: ${error.message}`, 'error');
        } finally {
            progress.style.display = 'none';
        }
    }

    function showResult(message, type) {
        result.innerHTML = message;
        result.className = `result ${type}`;
        result.style.display = 'block';
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('/stats');
        const data = await response.json();

        let statsHtml = `
            <div class="stat-item">
                <span><strong>Jami ma'lumotlar:</strong></span>
                <span>${data.total_records.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span><strong>Jami Import qiymati:</strong></span>
                <span>$${data.total_import_value.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span><strong>Jami Export qiymati:</strong></span>
                <span>$${data.total_export_value.toLocaleString()}</span>
            </div>
        `;

        if (data.year_stats && data.year_stats.length > 0) {
            statsHtml += '<h4 style="margin: 15px 0 10px 0;">Yil bo\'yicha:</h4>';
            data.year_stats.forEach(item => {
                statsHtml += `
                    <div class="stat-item">
                        <span>${item.year}</span>
                        <span>${item.count.toLocaleString()}</span>
                    </div>
                `;
            });
        }

        if (data.country_stats && data.country_stats.length > 0) {
            statsHtml += '<h4 style="margin: 15px 0 10px 0;">Top davlatlar:</h4>';
            data.country_stats.slice(0, 5).forEach(item => {
                statsHtml += `
                    <div class="stat-item">
                        <span>${item.country}</span>
                        <span>${item.count.toLocaleString()}</span>
                    </div>
                `;
            });
        }

        document.getElementById('importStats').innerHTML = statsHtml;
        document.getElementById('recentImports').style.display = 'block';

    } catch (error) {
        console.error('Statistika yuklashda xatolik:', error);
    }
}

// Load analytics
async function loadAnalytics() {
    try {
        const response = await fetch('/stats');
        const data = await response.json();

        const analyticsHtml = `
            <div class="stat-card total">
                <div class="stat-value">${data.total_records.toLocaleString()}</div>
                <div class="stat-label">Jami Records</div>
            </div>
            <div class="stat-card import">
                <div class="stat-value">$${(data.total_import_value / 1000000).toFixed(1)}M</div>
                <div class="stat-label">Import Qiymati</div>
            </div>
            <div class="stat-card export">
                <div class="stat-value">$${(data.total_export_value / 1000000).toFixed(1)}M</div>
                <div class="stat-label">Export Qiymati</div>
            </div>
            <div class="stat-card countries">
                <div class="stat-value">${data.country_stats.length}</div>
                <div class="stat-label">Faol Davlatlar</div>
            </div>
        `;

        document.getElementById('analyticsContent').innerHTML = analyticsHtml;

    } catch (error) {
        console.error('Analytics yuklashda xatolik:', error);
    }
}

// Clear all data
async function clearAllData() {
    if (!confirm('Barcha ma\'lumotlarni o\'chirishni xohlaysizmi? Bu harakat qaytarib bo\'lmaydi!')) {
        return;
    }

    try {
        const response = await fetch('/clear-data', {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            loadStats();
        } else {
            alert(`Xatolik: ${data.error}`);
        }
        
    } catch (error) {
        alert(`Tarmoq xatoligi: ${error.message}`);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupFileUpload();
    loadStats();
    
    console.log('🔧 Admin panel ishga tushdi');
});
