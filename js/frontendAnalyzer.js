// ===== FRONTEND ANALYZER (NO CSVAnalyzer DECLARATION) =====
// Hanya berisi fungsi-fungsi frontend, tidak deklarasi CSVAnalyzer

const FrontendAnalyzer = {
    // ===== UPDATE HORIZONTAL BARS =====
    updateHorizontalBars: function() {
        console.log('🔄 FrontendAnalyzer: Updating horizontal bars...');
        
        // Coba dapatkan data dari MANA SAJA
        let allData = [];
        
        // Coba 5 cara berbeda untuk dapatkan data
        const possibleDataSources = [
            // 1. Dari CSVAnalyzer (dari analyzer.js)
            () => {
                if (typeof CSVAnalyzer !== 'undefined') {
                    if (CSVAnalyzer.loadRawDataFromLocalStorage) {
                        return CSVAnalyzer.loadRawDataFromLocalStorage();
                    }
                }
                return null;
            },
            
            // 2. Dari localStorage key yang umum
            () => {
                const keys = ['csvRawData', 'analysisData', 'polaritasData', 'sentimentResults'];
                for (const key of keys) {
                    try {
                        const data = localStorage.getItem(key);
                        if (data) {
                            const parsed = JSON.parse(data);
                            if (Array.isArray(parsed)) return parsed;
                            if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
                            if (parsed.rawData && Array.isArray(parsed.rawData)) return parsed.rawData;
                        }
                    } catch (e) {}
                }
                return null;
            },
            
            // 3. Scan semua localStorage untuk data array
            () => {
                const results = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    try {
                        const value = localStorage.getItem(key);
                        if (value && value.length > 10 && value.includes('[')) {
                            const parsed = JSON.parse(value);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                // Cek apakah item pertama punya Klasifikasi atau Keyword
                                const firstItem = parsed[0];
                                if (firstItem && typeof firstItem === 'object') {
                                    const keys = Object.keys(firstItem);
                                    if (keys.some(k => k.toLowerCase().includes('klasifikasi')) ||
                                        keys.some(k => k.toLowerCase().includes('keyword'))) {
                                        console.log(`✅ Found data in key: ${key}`);
                                        return parsed;
                                    }
                                }
                            }
                        }
                    } catch (e) {}
                }
                return null;
            },
            
            // 4. Coba parse data dari polaritasAnalysis
            () => {
                try {
                    const polaritas = localStorage.getItem('polaritasAnalysis');
                    if (polaritas) {
                        const parsed = JSON.parse(polaritas);
                        
                        // Coba extract dari berbagai struktur
                        if (parsed.formatted && parsed.formatted.rawData) {
                            return parsed.formatted.rawData;
                        }
                        if (parsed.rawData) {
                            return parsed.rawData;
                        }
                        if (parsed.data && Array.isArray(parsed.data)) {
                            return parsed.data;
                        }
                        
                        // Coba convert classifications ke array
                        if (parsed.classifications) {
                            const allTweets = [];
                            Object.keys(parsed.classifications).forEach(category => {
                                if (parsed.classifications[category] && 
                                    parsed.classifications[category].tweets) {
                                    allTweets.push(...parsed.classifications[category].tweets);
                                }
                            });
                            if (allTweets.length > 0) return allTweets;
                        }
                    }
                } catch (e) {}
                return null;
            }
        ];
        
        // Coba semua data source
        for (const source of possibleDataSources) {
            try {
                const data = source();
                if (data && Array.isArray(data) && data.length > 0) {
                    allData = data;
                    console.log(`✅ Got ${allData.length} items from data source`);
                    break;
                }
            } catch (error) {
                console.warn('⚠️ Error in data source:', error);
            }
        }
        
        console.log(`📊 Total data items found: ${allData.length}`);
        
        // Jika tidak ada data, tampilkan kosong
        if (allData.length === 0) {
            console.warn('❌ NO DATA FOUND AT ALL');
            
            const negativeContainer = document.getElementById('negativeKeywords');
            const positiveContainer = document.getElementById('positiveKeywords');
            
            if (negativeContainer) {
                negativeContainer.innerHTML = `
                    <div class="horizontal-item">
                        <div class="bar-label">No data</div>
                        <div class="horizontal-bar">
                            <div class="bar-fill bar-negative" style="width:0%;">0</div>
                        </div>
                    </div>
                `;
            }
            
            if (positiveContainer) {
                positiveContainer.innerHTML = `
                    <div class="horizontal-item">
                        <div class="bar-label">No data</div>
                        <div class="horizontal-bar">
                            <div class="bar-fill bar-positive" style="width:0%;">0</div>
                        </div>
                    </div>
                `;
            }
            
            return;
        }
        
        // Hitung keyword
        const negKeywords = {};
        const posKeywords = {};
        
        allData.forEach(item => {
            if (!item || typeof item !== 'object') return;
            
            // Cari klasifikasi
            let klasifikasi = '';
            Object.keys(item).forEach(key => {
                if (key.toLowerCase().includes('klasifikasi') || 
                    key.toLowerCase().includes('sentiment') ||
                    key.toLowerCase().includes('category') ||
                    key.toLowerCase().includes('label')) {
                    klasifikasi = String(item[key] || '').toLowerCase();
                }
            });
            
            // Cari keyword
            let keyword = '';
            Object.keys(item).forEach(key => {
                if (key.toLowerCase().includes('keyword') ||
                    key.toLowerCase().includes('key_word') ||
                    key.toLowerCase().includes('term')) {
                    keyword = String(item[key] || '').trim();
                }
            });
            
            if (!klasifikasi || !keyword || keyword === '') return;
            
            // LOGIKA KLASIFIKASI YANG SAMA DENGAN DASHBOARD
            if (klasifikasi.includes('poster') || klasifikasi.includes('positif') || klasifikasi === 'positif' || klasifikasi === 'poster') {
                posKeywords[keyword] = (posKeywords[keyword] || 0) + 1;
            } else if (klasifikasi.includes('digital') || klasifikasi.includes('negatif') || klasifikasi === 'negatif' || klasifikasi === 'digital') {
                negKeywords[keyword] = (negKeywords[keyword] || 0) + 1;
            }
        });
        
        console.log('📊 Negative keywords:', negKeywords);
        console.log('📊 Positive keywords:', posKeywords);
        
        // Buat top 5
        const topNeg = Object.entries(negKeywords)
            .map(([k, v]) => ({ keyword: k, count: v }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        const topPos = Object.entries(posKeywords)
            .map(([k, v]) => ({ keyword: k, count: v }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        // Update charts
        this.updateChartHTML('negativeKeywords', topNeg, 'bar-negative');
        this.updateChartHTML('positiveKeywords', topPos, 'bar-positive');
    },

    // ===== UPDATE CHART HTML =====
    updateChartHTML: function(containerId, items, barClass) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (items.length === 0) {
            container.innerHTML = `
                <div class="horizontal-item">
                    <div class="bar-label">No keywords</div>
                    <div class="horizontal-bar">
                        <div class="bar-fill ${barClass}" style="width:0%;">0</div>
                    </div>
                </div>
            `;
            return;
        }
        
        const maxCount = Math.max(...items.map(i => i.count));
        
        container.innerHTML = items.map(item => {
            const width = maxCount > 0 ? (item.count / maxCount * 100) : 0;
            const displayName = item.keyword.length > 30 
                ? item.keyword.charAt(0).toUpperCase() + item.keyword.slice(1, 30) + '...'
                : item.keyword.charAt(0).toUpperCase() + item.keyword.slice(1);
            
            return `
                <div class="horizontal-item">
                    <div class="bar-label" title="${item.keyword} (${item.count}x)">
                        <span class="keyword-text">${displayName}</span>
                        <span class="keyword-count">${item.count}</span>
                    </div>
                    <div class="horizontal-bar">
                        <div class="bar-fill ${barClass}" style="width:${width}%;">${item.count}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ===== GET RAW DATA =====
    getRawData: function() {
        // Coba dapatkan data dari berbagai sumber
        if (typeof CSVAnalyzer !== 'undefined' && CSVAnalyzer.loadRawDataFromLocalStorage) {
            return CSVAnalyzer.loadRawDataFromLocalStorage();
        }
        
        // Fallback ke localStorage
        try {
            const rawData = localStorage.getItem('csvRawData');
            if (rawData) return JSON.parse(rawData);
            
            const analysisData = localStorage.getItem('polaritasAnalysis');
            if (analysisData) {
                const parsed = JSON.parse(analysisData);
                if (parsed.rawData) return parsed.rawData;
                if (parsed.data && parsed.data.rawData) return parsed.data.rawData;
            }
        } catch (e) {
            console.warn('⚠️ Error getting raw data:', e);
        }
        
        return [];
    },

    // ===== INITIALIZE =====
    init: function() {
        console.log('🚀 FrontendAnalyzer initialized');
        // Inisialisasi lainnya jika perlu
    }
};

// Auto-initialize
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        FrontendAnalyzer.init();
    });
}