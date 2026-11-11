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
    // --- 4. Drag-and-Drop Engine ---
    
    const inventoryItems = document.querySelectorAll('.inventory-item');
    const canvas = document.getElementById('lab-canvas');
    const activeControls = document.getElementById('active-controls');
    
    // State tracker for unique IDs
    let itemCount = 0;
    let draggedItemType = null;
    let draggedItemName = null;

    // A. Dragging from the Inventory
    inventoryItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItemType = 'new'; // Flag that this is coming from inventory
            draggedItemName = e.target.textContent;
            e.dataTransfer.setData('text/plain', draggedItemName);
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    // B. Setting up the Canvas Drop Zone
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'copy';
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        
        // Calculate drop position relative to the canvas
        const canvasRect = canvas.getBoundingClientRect();
        const dropX = e.clientX - canvasRect.left;
        const dropY = e.clientY - canvasRect.top;

        if (draggedItemType === 'new') {
            spawnCanvasItem(draggedItemName, dropX, dropY);
            draggedItemType = null;
        }
    });

    // C. Spawning Items on the Workbench
    function spawnCanvasItem(name, x, y) {
        // Remove placeholder text if it's the first item
        const placeholder = canvas.querySelector('.placeholder-text');
        if (placeholder) placeholder.remove();

        itemCount++;
        const itemId = `item-${itemCount}`;

        // Create the physical element
        const itemEl = document.createElement('div');
        itemEl.className = 'canvas-item';
        itemEl.id = itemId;
        
        // Simple icon logic based on name matching
        let icon = '🧪'; 
        if (name.includes('Beaker') || name.includes('Flask')) icon = '🫙';
        if (name.includes('Burner')) icon = '🔥';
        if (name.includes('Thermometer')) icon = '🌡️';
        if (name.includes('Water')) icon = '💧';

        itemEl.innerHTML = `<div class="item-icon">${icon}</div><div>${name}</div>`;
        
        // Center the item on the mouse cursor
        itemEl.style.left = `${x - 45}px`; // 45 is half of the 90px width
        itemEl.style.top = `${y - 45}px`;

        // Add selection and movement capabilities to the new item
        makeItemInteractable(itemEl, name);

        canvas.appendChild(itemEl);
        window.logToExperiment(`Added ${name} to the workbench.`);
    }

    // D. Making Canvas Items Movable and Selectable
    function makeItemInteractable(element, name) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        // 1. Selection Logic (Clicking an item)
        element.addEventListener('mousedown', (e) => {
            // Deselect all other items
            document.querySelectorAll('.canvas-item').forEach(el => el.classList.remove('selected'));
            element.classList.add('selected');

            // Update Right Panel Controls
            updateRightPanelControls(name, element.id);

            // Setup for dragging around the canvas
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = parseInt(element.style.left || 0, 10);
            initialTop = parseInt(element.style.top || 0, 10);
            
            element.style.zIndex = 120; // Bring to front while dragging
        });

        // 2. Moving Logic
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            // Constrain movement to within the canvas bounds (approximate)
            const newLeft = Math.max(0, initialLeft + dx);
            const newTop = Math.max(0, initialTop + dy);

            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;
        });

        // 3. Drop/Release Logic
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.zIndex = 100; // Reset z-index
            }
        });
    }

    // E. Dynamic Right-Panel Updates
    function updateRightPanelControls(itemName, itemId) {
        activeControls.innerHTML = ''; // Clear previous controls

        const title = document.createElement('h4');
        title.style.color = '#fff';
        title.style.marginBottom = '10px';
        title.textContent = `Selected: ${itemName}`;
        activeControls.appendChild(title);

        // Generate specific controls based on the item type
        if (itemName.includes('Burner')) {
            activeControls.innerHTML += `
                <label style="display:block; margin-bottom:5px; font-size:0.85rem;">Flame Intensity</label>
                <input type="range" min="0" max="100" value="0" style="width:100%;">
            `;
        } else if (itemName.includes('Flask') || itemName.includes('Beaker')) {
            activeControls.innerHTML += `
                <div style="font-size:0.85rem; margin-bottom:10px;">
                    Volume: <span style="color:#4da6ff;">0 mL</span><br>
                    Contents: <span style="color:#aaa;">Empty</span>
                </div>
                <button class="danger-btn" style="background:#5bc0de; width:100%;" onclick="alert('Emptying container...')">Empty Container</button>
            `;
        } else {
            activeControls.innerHTML += `<p class="placeholder-text">No active controls for this item.</p>`;
        }
    }

});
