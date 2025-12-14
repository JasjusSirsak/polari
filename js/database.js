// ===== LOAD FILES FROM INDEXEDDB =====
async function loadAllUploadedFiles() {
    console.log('📂 Loading uploaded files...');
    
    allUploadedFiles = {};
    tabCounter = 1;
    
    // Coba load dari IndexedDB dulu
    if (typeof fileDB !== 'undefined' && FileDatabase.isSupported()) {
        try {
            const files = await fileDB.getAllFiles();
            
            if (files && files.length > 0) {
                console.log(`📦 Found ${files.length} files in IndexedDB`);
                
                files.forEach((file, index) => {
                    const fileId = `file${tabCounter++}`;
                    
                    allUploadedFiles[fileId] = {
                        id: fileId,
                        dbId: file.id, // Store IndexedDB ID
                        name: file.name,
                        data: file.data,
                        rawData: file.rawData || file.data,
                        timestamp: file.timestamp,
                        size: file.size,
                        itemCount: file.itemCount
                    };
                    
                    console.log(`✅ Loaded: ${file.name} (${file.itemCount || 0} items)`);
                });
                
                return Object.keys(allUploadedFiles).length;
            }
        } catch (dbError) {
            console.warn('⚠️ IndexedDB error, falling back:', dbError);
        }
    }
    
    // Fallback ke localStorage
    const localStorageFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '{}');
    if (Object.keys(localStorageFiles).length > 0) {
        console.log(`📦 Found ${Object.keys(localStorageFiles).length} files in localStorage`);
        
        Object.keys(localStorageFiles).forEach((key, index) => {
            const fileId = `file${tabCounter++}`;
            const file = localStorageFiles[key];
            
            allUploadedFiles[fileId] = {
                id: fileId,
                name: file.name || `File ${key}`,
                data: file.data,
                rawData: file.data || [],
                timestamp: file.timestamp || new Date().toISOString()
            };
        });
        
        return Object.keys(allUploadedFiles).length;
    }
    
    // Fallback ke single file data
    const singleFileData = JSON.parse(localStorage.getItem('csvRawData') || 'null');
    if (singleFileData && Array.isArray(singleFileData)) {
        const fileId = `file${tabCounter++}`;
        
        allUploadedFiles[fileId] = {
            id: fileId,
            name: 'Uploaded Data',
            data: singleFileData,
            rawData: singleFileData,
            timestamp: new Date().toISOString()
        };
        
        console.log(`✅ Loaded single file: ${singleFileData.length} items`);
        return 1;
    }
    
    console.log('📭 No files found');
    return 0;
}

// ===== UPDATE CLOSE TAB FUNCTION =====
async function closeTab(fileId) {
    if (Object.keys(allUploadedFiles).length <= 1) {
        showToast('Warning', 'Minimal harus ada 1 tab terbuka', 'warning');
        return;
    }
    
    if (!confirm(`Tutup tab "${allUploadedFiles[fileId].name}"?`)) return;
    
    const file = allUploadedFiles[fileId];
    
    // Hapus dari IndexedDB jika ada
    if (file.dbId && typeof fileDB !== 'undefined') {
        try {
            await fileDB.deleteFile(file.dbId);
            console.log(`🗑️ Deleted from IndexedDB: ${file.dbId}`);
        } catch (error) {
            console.warn('⚠️ Failed to delete from IndexedDB:', error);
        }
    }
    
    // Hapus dari data lokal
    delete allUploadedFiles[fileId];
    
    // Aktifkan tab lain
    const remainingTabs = Object.keys(allUploadedFiles);
    if (remainingTabs.length > 0) {
        activateTab(remainingTabs[0]);
    }
    
    // Regenerate tabs UI
    generateTabsUI();
    
    showToast('Info', 'Tab ditutup', 'info');
}