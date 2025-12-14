/**
 * CSV Analyzer Module
 * Handles CSV parsing, data aggregation, and localStorage management
 */

const CSVAnalyzer = {
    // ===== CSV PARSING =====
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV file is empty or invalid');
        }

        // Parse header - FLEXIBLE VERSION
        const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
        
        // Cari kolom yang ada dengan nama yang mirip
        const findColumn = (possibleNames) => {
            for (const name of possibleNames) {
                const found = headers.find(h => h.toLowerCase().includes(name.toLowerCase()));
                if (found) return found;
            }
            return null;
        };

        const klasifikasiCol = findColumn(['klasifikasi', 'classification', 'sentiment', 'category', 'label']);
        const keywordCol = findColumn(['keyword', 'key_word', 'term', 'phrase', 'text']);
        const fullTextCol = findColumn(['full_text', 'text', 'tweet', 'content', 'message']);

        // Hanya klasifikasi yang wajib
        if (!klasifikasiCol) {
            throw new Error('Missing required column: Klasifikasi/Classification/Sentiment');
        }

        // Mapping kolom
        const colIndices = {
            klasifikasi: headers.indexOf(klasifikasiCol),
            keyword: keywordCol ? headers.indexOf(keywordCol) : -1,
            fullText: fullTextCol ? headers.indexOf(fullTextCol) : -1,
            createdAt: headers.findIndex(h => h.toLowerCase().includes('created')),
            username: headers.findIndex(h => h.toLowerCase().includes('username') || h.toLowerCase().includes('user')),
            userId: headers.findIndex(h => h.toLowerCase().includes('user_id') || h.toLowerCase().includes('id')),
            conversationId: headers.findIndex(h => h.toLowerCase().includes('conversation')),
            favoriteCount: headers.findIndex(h => h.toLowerCase().includes('favorite')),
            replyCount: headers.findIndex(h => h.toLowerCase().includes('reply')),
            retweetCount: headers.findIndex(h => h.toLowerCase().includes('retweet')),
            quoteCount: headers.findIndex(h => h.toLowerCase().includes('quote')),
            language: headers.findIndex(h => h.toLowerCase().includes('lang')),
            location: headers.findIndex(h => h.toLowerCase().includes('location')),
            tweetUrl: headers.findIndex(h => h.toLowerCase().includes('url') || h.toLowerCase().includes('link')),
            imageUrl: headers.findIndex(h => h.toLowerCase().includes('image'))
        };

        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;

            const values = this.parseCSVLine(lines[i]);
            if (values.length < headers.length) continue;

            const row = {
                klasifikasi: values[colIndices.klasifikasi]?.trim() || '',
                keyword: colIndices.keyword >= 0 ? values[colIndices.keyword]?.trim() : '',
                fullText: colIndices.fullText >= 0 ? values[colIndices.fullText]?.trim() : '',
                createdAt: colIndices.createdAt >= 0 ? values[colIndices.createdAt]?.trim() : '',
                username: colIndices.username >= 0 ? values[colIndices.username]?.trim() : '',
                userId: colIndices.userId >= 0 ? values[colIndices.userId]?.trim() : '',
                conversationId: colIndices.conversationId >= 0 ? values[colIndices.conversationId]?.trim() : '',
                favoriteCount: colIndices.favoriteCount >= 0 ? parseInt(values[colIndices.favoriteCount]?.trim() || '0') || 0 : 0,
                replyCount: colIndices.replyCount >= 0 ? parseInt(values[colIndices.replyCount]?.trim() || '0') || 0 : 0,
                retweetCount: colIndices.retweetCount >= 0 ? parseInt(values[colIndices.retweetCount]?.trim() || '0') || 0 : 0,
                quoteCount: colIndices.quoteCount >= 0 ? parseInt(values[colIndices.quoteCount]?.trim() || '0') || 0 : 0,
                language: colIndices.language >= 0 ? values[colIndices.language]?.trim() : '',
                location: colIndices.location >= 0 ? values[colIndices.location]?.trim() : '',
                tweetUrl: colIndices.tweetUrl >= 0 ? values[colIndices.tweetUrl]?.trim() : '',
                imageUrl: colIndices.imageUrl >= 0 ? values[colIndices.imageUrl]?.trim() : ''
            };

            // Jika tidak ada keyword, coba buat dari fullText
            if (!row.keyword && row.fullText) {
                // Ambil 2-3 kata pertama sebagai keyword
                const words = row.fullText.split(/\s+/).slice(0, 3).join(' ');
                if (words.length > 0) row.keyword = words;
            }

            data.push(row);
        }

        if (data.length === 0) {
            throw new Error('No valid data rows found in CSV');
        }

        return data;
    },

    // ===== CSV LINE PARSER (handle quoted fields) =====
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (insideQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (char === ',' && !insideQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    },

    // ===== DATA AGGREGATION =====
    aggregateData(parsedData) {
        const aggregated = {
            totalTweets: 0,
            classifications: {
                Positif: 0,
                Negatif: 0,
                Promosi: 0
            },
            keywordStats: {
                Positif: {},
                Negatif: {},
                Promosi: {}
            },
            tweets: {
                Positif: [],
                Negatif: [],
                Promosi: []
            }
        };

        parsedData.forEach(row => {
            const klasifikasi = row.klasifikasi || '';
            const keyword = row.keyword;

            // Count total tweets
            if (row.fullText) {
                aggregated.totalTweets++;
            }

            // Count classification
            if (klasifikasi in aggregated.classifications) {
                aggregated.classifications[klasifikasi]++;
            }

            // Count keywords (only if not empty)
            if (keyword && klasifikasi in aggregated.keywordStats) {
                if (!aggregated.keywordStats[klasifikasi][keyword]) {
                    aggregated.keywordStats[klasifikasi][keyword] = 0;
                }
                aggregated.keywordStats[klasifikasi][keyword]++;
            }

            // Store tweet data untuk detail view
            if (klasifikasi in aggregated.tweets) {
                aggregated.tweets[klasifikasi].push({
                    fullText: row.fullText,
                    username: row.username || 'Unknown',
                    createdAt: row.createdAt || 'Unknown',
                    favoriteCount: row.favoriteCount || 0,
                    replyCount: row.replyCount || 0,
                    retweetCount: row.retweetCount || 0,
                    keyword: row.keyword || '',
                    tweetUrl: row.tweetUrl || '',
                    // Simpan semua data untuk backup
                    rawData: row
                });
            }
        });

        return aggregated;
    },

    // ===== GET TOP KEYWORDS =====
    getTopKeywords(keywordStats, limit = 5) {
        return Object.entries(keywordStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([keyword, count]) => ({
                keyword,
                count
            }));
    },

    // ===== PROCESS FILE =====
    async processFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const csvText = e.target.result;
                    const parsedData = this.parseCSV(csvText);
                    const aggregated = this.aggregateData(parsedData);
                    
                    // SIMPAN RAW DATA KE LOCALSTORAGE
                    localStorage.setItem('csvRawData', JSON.stringify(parsedData));
                    console.log(`✅ Saved ${parsedData.length} raw data items to localStorage`);
                    
                    resolve({
                        success: true,
                        fileName: file.name,
                        aggregated,
                        rawData: parsedData // Juga return raw data
                    });
                } catch (error) {
                    reject({
                        success: false,
                        fileName: file.name,
                        error: error.message
                    });
                }
            };

            reader.onerror = () => {
                reject({
                    success: false,
                    fileName: file.name,
                    error: 'Failed to read file'
                });
            };

            reader.readAsText(file);
        });
    },

    // ===== SAVE TO LOCALSTORAGE =====
    saveToLocalStorage(analysisData) {
        const storageData = {
            timestamp: new Date().toISOString(),
            data: analysisData,
            // SIMPAN JUGA RAW DATA
            rawData: analysisData.rawData || []
        };
        localStorage.setItem('polaritasAnalysis', JSON.stringify(storageData));
        console.log('✅ Analysis saved with raw data');
    },

    // ===== LOAD FROM LOCALSTORAGE =====
    loadFromLocalStorage() {
        const stored = localStorage.getItem('polaritasAnalysis');
        if (!stored) return null;

        try {
            const parsed = JSON.parse(stored);
            return parsed.data;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    },

    // ===== LOAD RAW DATA FROM LOCALSTORAGE =====
    loadRawDataFromLocalStorage() {
        const rawData = localStorage.getItem('csvRawData');
        if (!rawData) return null;

        try {
            return JSON.parse(rawData);
        } catch (error) {
            console.error('Error loading raw data from localStorage:', error);
            return null;
        }
    },

    // ===== CLEAR LOCALSTORAGE =====
    clearLocalStorage() {
        localStorage.removeItem('polaritasAnalysis');
        localStorage.removeItem('csvRawData');
    },

    // ===== FORMAT DATA FOR DASHBOARD =====
    formatForDashboard(aggregated) {
        const total = aggregated.totalTweets;
        const positifCount = aggregated.classifications.Positif || 0;
        const negatifCount = aggregated.classifications.Negatif || 0;
        const promosiCount = aggregated.classifications.Promosi || 0;

        const positifPercent = total > 0 ? ((positifCount / total) * 100).toFixed(1) : 0;
        const negatifPercent = total > 0 ? ((negatifCount / total) * 100).toFixed(1) : 0;
        const promosiPercent = total > 0 ? ((promosiCount / total) * 100).toFixed(1) : 0;

        return {
            totalTweets: total,
            classifications: {
                Positif: {
                    count: positifCount,
                    percent: parseFloat(positifPercent)
                },
                Negatif: {
                    count: negatifCount,
                    percent: parseFloat(negatifPercent)
                },
                Promosi: {
                    count: promosiCount,
                    percent: parseFloat(promosiPercent)
                }
            },
            topKeywords: {
                Positif: this.getTopKeywords(aggregated.keywordStats.Positif),
                Negatif: this.getTopKeywords(aggregated.keywordStats.Negatif),
                Promosi: this.getTopKeywords(aggregated.keywordStats.Promosi)
            },
            tweets: aggregated.tweets,
            rawDataCount: aggregated.tweets.Positif.length + aggregated.tweets.Negatif.length + aggregated.tweets.Promosi.length
        };
    },

    // ===== UTILITY: GET COLUMN NAMES FROM CSV =====
    getColumnNames(csvText) {
        try {
            const lines = csvText.trim().split('\n');
            if (lines.length < 1) return [];
            
            const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
            return headers;
        } catch (error) {
            console.error('Error getting column names:', error);
            return [];
        }
    },

    // ===== UTILITY: VALIDATE CSV STRUCTURE =====
    validateCSVStructure(csvText) {
        try {
            const lines = csvText.trim().split('\n');
            if (lines.length < 2) {
                return { valid: false, error: 'CSV file is empty or invalid' };
            }

            const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
            const colIndices = {
                klasifikasi: headers.findIndex(h => h.toLowerCase().includes('klasifikasi') || 
                                                  h.toLowerCase().includes('classification') || 
                                                  h.toLowerCase().includes('sentiment'))
            };

            if (colIndices.klasifikasi === -1) {
                return { valid: false, error: 'Missing required column: Klasifikasi/Classification/Sentiment' };
            }

            return { 
                valid: true, 
                headers: headers,
                totalRows: lines.length - 1
            };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSVAnalyzer;
}