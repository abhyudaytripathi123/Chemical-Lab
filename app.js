document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Tab Navigation Logic for Stockroom ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked button
            btn.classList.add('active');

            // Find and activate the corresponding content area
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- 2. System Log Helper Function ---
    // We will use this globally in future parts to write to the experiment log
    window.logToExperiment = function(message, type = 'normal') {
        const logBox = document.getElementById('experiment-log');
        const entry = document.createElement('p');
        entry.className = `log-entry ${type}`;
        
        // Add timestamp
        const now = new Date();
        const timeString = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}]`;
        
        entry.textContent = `${timeString} ${message}`;
        logBox.appendChild(entry);
        
        // Auto-scroll to bottom
        logBox.scrollTop = logBox.scrollHeight;
    };

    // --- 3. Workbench Reset ---
    document.getElementById('reset-btn').addEventListener('click', () => {
        // Confirmation before clearing
        if(confirm("Are you sure you want to clean the workbench? All unsaved progress will be lost.")) {
            const canvas = document.getElementById('lab-canvas');
            // Reset to placeholder state
            canvas.innerHTML = '<p class="placeholder-text">Drag and drop equipment here to begin.</p>';
            
            window.logToExperiment('Workbench cleaned and reset.', 'system');
            
            // Reset telemetry displays
            document.getElementById('temp-display').textContent = '22.0';
            document.getElementById('ph-display').textContent = '7.0';
            document.getElementById('press-display').textContent = '1.0';
        }
    });

});
