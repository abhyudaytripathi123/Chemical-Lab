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
    // --- 5. Chemical Simulation Engine ---
    
    // Global state to track properties of everything on the workbench
    const labState = {}; 

    // Helper to extract max volume from string (e.g., "Beaker (250mL)")
    function getMaxVolume(name) {
        const match = name.match(/(\d+)mL/);
        return match ? parseInt(match[1]) : 100; // Default 100mL if not specified
    }

    // A. Initialize Item Data when spawned
    // (Modify your existing spawnCanvasItem function to include this, or hook into it)
    const originalSpawn = spawnCanvasItem;
    spawnCanvasItem = function(name, x, y) {
        // Call the original spawn logic to create the DOM element
        originalSpawn(name, x, y);
        
        // Grab the newly created item's ID (itemCount is from Part 2)
        const itemId = `item-${itemCount}`;
        const itemEl = document.getElementById(itemId);

        // Add a liquid fill div to the item
        const liquidDiv = document.createElement('div');
        liquidDiv.className = 'liquid-fill';
        itemEl.appendChild(liquidDiv);

        // Register in the physics/chemistry state
        const isContainer = name.includes('Beaker') || name.includes('Flask') || name.includes('Tube');
        
        labState[itemId] = {
            name: name,
            isContainer: isContainer,
            maxVolume: isContainer ? getMaxVolume(name) : 0,
            currentVolume: 0,
            temperature: 22.0, // Default room temp
            pH: 7.0, // Default neutral
            contents: [] // Array to track what chemicals are inside
        };
    };

    // B. Pouring Logic (Dropping an item onto another item)
    // Update the canvas drop listener from Part 2
    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        
        const canvasRect = canvas.getBoundingClientRect();
        const dropX = e.clientX - canvasRect.left;
        const dropY = e.clientY - canvasRect.top;

        // Check if dropped directly onto an existing canvas item
        const targetEl = document.elementFromPoint(e.clientX, e.clientY).closest('.canvas-item');

        if (draggedItemType === 'new') {
            if (targetEl && labState[targetEl.id].isContainer && !draggedItemName.includes('Beaker') && !draggedItemName.includes('Flask')) {
                // Poured a chemical directly into a container from inventory
                pourChemical(draggedItemName, targetEl.id);
            } else {
                // Dropped onto empty workspace
                spawnCanvasItem(draggedItemName, dropX, dropY);
            }
            draggedItemType = null;
        }
    });

    // C. The Mixing Math
    function pourChemical(chemicalName, targetId) {
        const container = labState[targetId];
        const targetEl = document.getElementById(targetId);
        
        // Define what is being poured (Simulated pouring 50mL at a time for this example)
        const pourAmount = 50; 
        
        if (container.currentVolume + pourAmount > container.maxVolume) {
            window.logToExperiment(`Spill Warning: ${container.name} overflowed!`, 'danger');
            return;
        }

        // 1. Update Volume & Contents
        container.currentVolume += pourAmount;
        container.contents.push(chemicalName);

        // 2. Simplified Chemistry Engine (Calculating new pH)
        let newPH = container.pH;
        let liquidClass = 'water';

        if (chemicalName.includes('HCl')) {
            newPH = ((container.pH * (container.currentVolume - pourAmount)) + (1.0 * pourAmount)) / container.currentVolume;
            liquidClass = 'acid';
        } else if (chemicalName.includes('NaOH')) {
            newPH = ((container.pH * (container.currentVolume - pourAmount)) + (13.0 * pourAmount)) / container.currentVolume;
            liquidClass = 'base';
        }

        container.pH = parseFloat(newPH.toFixed(2)); // Round to 2 decimals

        // 3. Update Visuals
        const fillPercentage = (container.currentVolume / container.maxVolume) * 100;
        const liquidDiv = targetEl.querySelector('.liquid-fill');
        liquidDiv.style.height = `${fillPercentage}%`;
        liquidDiv.className = `liquid-fill ${liquidClass}`;

        window.logToExperiment(`Added ${pourAmount}mL of ${chemicalName} to ${container.name}.`);

        // 4. Update Telemetry if this item is currently selected
        if (targetEl.classList.contains('selected')) {
            updateTelemetry(container);
            updateRightPanelControls(container.name, targetId); // Refresh controls to show new volume
        }
    }

    // D. Update Live Telemetry Panel
    function updateTelemetry(containerData) {
        document.getElementById('temp-display').textContent = containerData.temperature.toFixed(1);
        document.getElementById('ph-display').textContent = containerData.pH.toFixed(1);
        // Pressure remains 1.0 atm for open containers
        document.getElementById('press-display').textContent = '1.0'; 
    }

    // E. Hook Selection to Telemetry
    // Add this inside the makeItemInteractable 'mousedown' event from Part 2
    document.addEventListener('mousedown', (e) => {
        const itemEl = e.target.closest('.canvas-item');
        if (itemEl && labState[itemEl.id]) {
            updateTelemetry(labState[itemEl.id]);
        }
    });

    // F. Update Container Controls display (Overrides the mock logic in Part 2)
    const originalUpdateControls = updateRightPanelControls;
    updateRightPanelControls = function(itemName, itemId) {
        const data = labState[itemId];
        if (data && data.isContainer) {
            const contentString = data.contents.length > 0 ? data.contents.join(', ') : 'Empty';
            activeControls.innerHTML = `
                <h4 style="color:#fff; margin-bottom:10px;">Selected: ${itemName}</h4>
                <div style="font-size:0.85rem; margin-bottom:10px;">
                    Volume: <span style="color:#4da6ff;">${data.currentVolume} / ${data.maxVolume} mL</span><br>
                    Contents: <span style="color:#aaa;">${contentString}</span>
                </div>
                <button class="danger-btn" style="background:#5bc0de; width:100%;" onclick="emptyContainer('${itemId}')">Empty Container</button>
            `;
        } else {
            originalUpdateControls(itemName, itemId);
        }
    };

    // G. Global function to empty a container
    window.emptyContainer = function(itemId) {
        const container = labState[itemId];
        container.currentVolume = 0;
        container.pH = 7.0;
        container.temperature = 22.0;
        container.contents = [];

        const targetEl = document.getElementById(itemId);
        const liquidDiv = targetEl.querySelector('.liquid-fill');
        liquidDiv.style.height = '0%';
        liquidDiv.className = 'liquid-fill';

        updateTelemetry(container);
        updateRightPanelControls(container.name, itemId);
        window.logToExperiment(`Emptied ${container.name}.`);
    };
    // --- 6. Equipment Snapping Engine ---

    // A. Define the logic for what can snap to what
    const snapRules = {
        'Bunsen Burner': ['Beaker', 'Flask', 'Test Tube'],
        // You can add more rules later, e.g.:
        // 'Retort Stand': ['Burette'],
        // 'Tripod': ['Beaker', 'Flask']
    };

    // B. Calculate distance between two elements
    function getDistance(el1, el2) {
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();
        
        // Calculate center points
        const center1X = rect1.left + (rect1.width / 2);
        const center1Y = rect1.top + (rect1.height / 2);
        const center2X = rect2.left + (rect2.width / 2);
        const center2Y = rect2.top + (rect2.height / 2);

        return Math.sqrt(Math.pow(center1X - center2X, 2) + Math.pow(center1Y - center2Y, 2));
    }

    // C. The Snapping Logic (Run when dragging stops)
    // Modify the existing mouseup event listener from Part 2 (makeItemInteractable)
    // Find this block in your code:
    /*
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.zIndex = 100; // Reset z-index
        }
    });
    */
    // And REPLACE it with this:

    const snapThreshold = 60; // Pixels. How close they need to be to snap.

    document.addEventListener('mouseup', (e) => {
        if (!window.currentDraggingElement) return; // We need to track the current dragged element globally
        
        const element = window.currentDraggingElement;
        const name = element.dataset.itemName; // Assume we save the name in a dataset attribute
        const itemId = element.id;

        window.isDragging = false;
        element.style.zIndex = 100;
        window.currentDraggingElement = null;

        // Check for snapping
        const allCanvasItems = document.querySelectorAll('.canvas-item');
        let snapped = false;

        allCanvasItems.forEach(targetEl => {
            if (targetEl.id === itemId) return; // Don't snap to itself

            const targetName = labState[targetEl.id].name;
            const distance = getDistance(element, targetEl);

            // 1. Is the target a base (like a Burner) and am I a container?
            if (snapRules[targetName]) {
                const canSnap = snapRules[targetName].some(allowed => name.includes(allowed));
                if (canSnap && distance < snapThreshold) {
                    executeSnap(element, targetEl, itemId, targetEl.id, 'top');
                    snapped = true;
                }
            }
            
            // 2. Am I a base and is the target a container?
            if (!snapped && snapRules[name]) {
                const canSnap = snapRules[name].some(allowed => targetName.includes(allowed));
                if (canSnap && distance < snapThreshold) {
                    executeSnap(targetEl, element, targetEl.id, itemId, 'top');
                    snapped = true;
                }
            }
        });

        if (!snapped) {
            // If we moved it away, break any existing links
            breakSnapLink(itemId);
        }
    });

    // We need to update the mousedown event to track the dragging element globally
    // Find this block in makeItemInteractable:
    /*
    element.addEventListener('mousedown', (e) => {
        // ... selection logic ...
        isDragging = true;
    */
    // Add these lines right after `isDragging = true;`:
    /*
        window.isDragging = true;
        window.currentDraggingElement = element;
        element.dataset.itemName = name; // Ensure the name is easily accessible
    */

    // D. Executing the Snap
    function executeSnap(childEl, parentEl, childId, parentId, position) {
        // Visually align them
        const parentLeft = parseInt(parentEl.style.left, 10);
        const parentTop = parseInt(parentEl.style.top, 10);

        if (position === 'top') {
            childEl.style.left = `${parentLeft}px`;
            childEl.style.top = `${parentTop - 45}px`; // Offset so it sits on top
        }

        // Logical link in the state engine
        labState[parentId].attachedItem = childId;
        labState[childId].attachedTo = parentId;

        // Visual feedback
        childEl.style.boxShadow = '0 0 10px #4da6ff';
        setTimeout(() => childEl.style.boxShadow = '', 500);

        window.logToExperiment(`${labState[childId].name} secured to ${labState[parentId].name}.`, 'system');
    }

    // E. Breaking the Snap Link
    function breakSnapLink(itemId) {
        const state = labState[itemId];
        if (state.attachedTo) {
            const parentId = state.attachedTo;
            labState[parentId].attachedItem = null;
            state.attachedTo = null;
            window.logToExperiment(`${state.name} removed from ${labState[parentId].name}.`, 'system');
        }
        if (state.attachedItem) {
            const childId = state.attachedItem;
            labState[childId].attachedTo = null;
            state.attachedItem = null;
             window.logToExperiment(`${labState[childId].name} removed from ${state.name}.`, 'system');
        }
    }
    // --- 7. Thermodynamics Engine ---

    const ROOM_TEMP = 22.0; // Ambient temperature in °C
    const BOILING_POINT = 100.0; // Water boiling point in °C

    // A. Main Thermodynamics Simulation Loop (Runs twice per second)
    setInterval(() => {
        simulateHeatTransfer();
    }, 500);

    function simulateHeatTransfer() {
        Object.keys(labState).forEach(itemId => {
            const item = labState[itemId];
            const itemEl = document.getElementById(itemId);
            if (!itemEl) return;

            // 1. Heating logic for containers attached to a heat source
            if (item.isContainer && item.attachedTo) {
                const heatSource = labState[item.attachedTo];
                
                if (heatSource && heatSource.flameIntensity > 0) {
                    // Heat transfer rate depends on flame intensity and volume inside container
                    const heatInput = (heatSource.flameIntensity / 100) * 3.5; // °C gained per tick
                    const volumeFactor = item.currentVolume > 0 ? (50 / item.currentVolume) : 1.5; 
                    const tempIncrease = heatInput * volumeFactor;

                    item.temperature += tempIncrease;

                    // Cap at boiling point if container holds liquid
                    if (item.currentVolume > 0 && item.temperature >= BOILING_POINT) {
                        item.temperature = BOILING_POINT;
                        
                        // Add boiling effect
                        const liquidDiv = itemEl.querySelector('.liquid-fill');
                        if (liquidDiv && !liquidDiv.classList.contains('boiling')) {
                            liquidDiv.classList.add('boiling');
                            window.logToExperiment(`${item.name} has reached its boiling point (100°C)!`, 'system');
                        }
                    }

                    // Add heat visual to container
                    itemEl.classList.add('heating');
                } else {
                    itemEl.classList.remove('heating');
                    coolDown(item, itemEl);
                }
            } 
            // 2. Ambient cooling for unheated containers above room temperature
            else if (item.isContainer) {
                itemEl.classList.remove('heating');
                coolDown(item, itemEl);
            }

            // 3. Live Telemetry update if this item is currently selected
            if (itemEl.classList.contains('selected')) {
                updateTelemetry(item);
            }
        });
    }

    // B. Ambient Cooling Logic
    function coolDown(item, itemEl) {
        if (item.temperature > ROOM_TEMP) {
            item.temperature -= 0.4; // Cooling rate per tick
            if (item.temperature < ROOM_TEMP) item.temperature = ROOM_TEMP;

            // Remove boiling effect if temperature drops below threshold
            if (item.temperature < BOILING_POINT - 2) {
                const liquidDiv = itemEl.querySelector('.liquid-fill');
                if (liquidDiv) liquidDiv.classList.remove('boiling');
            }
        }
    }

    // C. Enhance Burner Right-Panel Controls to adjust flame intensity dynamically
    // Hook into existing updateRightPanelControls for Bunsen Burner
    const previousControlsFunc = updateRightPanelControls;
    updateRightPanelControls = function(itemName, itemId) {
        if (itemName.includes('Burner')) {
            const currentIntensity = labState[itemId].flameIntensity || 0;
            activeControls.innerHTML = `
                <h4 style="color:#fff; margin-bottom:10px;">Selected: ${itemName}</h4>
                <label style="display:block; margin-bottom:5px; font-size:0.85rem;">
                    Flame Intensity: <span id="intensity-val" style="color:#4da6ff;">${currentIntensity}%</span>
                </label>
                <input type="range" id="burner-slider" min="0" max="100" value="${currentIntensity}" style="width:100%;">
            `;

            // Event listener for the slider
            document.getElementById('burner-slider').addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                labState[itemId].flameIntensity = val;
                document.getElementById('intensity-val').textContent = `${val}%`;

                if (val === 0) {
                    window.logToExperiment(`Bunsen Burner extinguished.`);
                } else if (val > 0 && currentIntensity === 0) {
                    window.logToExperiment(`Bunsen Burner ignited at ${val}% intensity.`);
                }
            });
        } else {
            previousControlsFunc(itemName, itemId);
        }
    };
    // --- 8. Safety & Hazard Engine ---

    const MAX_DRY_TEMP = 160.0; // °C at which empty heated glass shatters
    const MAX_PRESSURE = 2.5;   // atm limit before sealed containers explode

    // A. Chemical Mixing Safety Verification (Hook into pourChemical)
    const basePourChemical = pourChemical;
    pourChemical = function(chemicalName, targetId) {
        const container = labState[targetId];

        // 1. Check if container is shattered
        if (container.isShattered) {
            window.logToExperiment(`Cannot pour into ${container.name}: Glassware is shattered!`, 'hazard');
            return;
        }

        // 2. Violation: Water into Concentrated Acid rule ("AA" - Add Acid to water)
        if (chemicalName === 'Distilled Water' && container.contents.includes('HCl (1M)') && container.currentVolume > 0) {
            window.logToExperiment(
                `SAFETY VIOLATION: Adding water directly to concentrated acid causes extreme exothermic splatter! Always add acid to water.`, 
                'hazard'
            );
            triggerSpatterEffect(targetId);
        }

        // Execute original pour logic
        basePourChemical(chemicalName, targetId);
    };

    // B. Hazard Checks inside Thermodynamics & Pressure Loop
    // Extend simulateHeatTransfer to enforce thermal and pressure breakage
    const baseHeatTransfer = simulateHeatTransfer;
    simulateHeatTransfer = function() {
        baseHeatTransfer();

        Object.keys(labState).forEach(itemId => {
            const item = labState[itemId];
            const itemEl = document.getElementById(itemId);
            if (!itemEl || item.isShattered) return;

            // 1. Thermal Shock Hazard: Heating dry/empty glass
            if (item.isContainer && item.currentVolume === 0 && item.temperature >= MAX_DRY_TEMP) {
                shatterGlassware(itemId, "Thermal Shock (Heated dry container without liquid)");
            }

            // 2. Over-Pressurization Hazard: Sealed container reaching boiling point
            if (item.isSealed && item.temperature >= 100.0) {
                item.pressure += 0.2; // Build up pressure per tick
                if (item.pressure >= MAX_PRESSURE) {
                    shatterGlassware(itemId, "Over-pressurization (Heated sealed vessel without pressure release)");
                }
            } else if (!item.isSealed && item.pressure > 1.0) {
                item.pressure = 1.0; // Normal pressure when open
            }
        });
    };

    // C. Glassware Destruction Logic
    function shatterGlassware(itemId, reason) {
        const item = labState[itemId];
        const itemEl = document.getElementById(itemId);
        if (!itemEl || item.isShattered) return;

        item.isShattered = true;
        item.currentVolume = 0;
        item.contents = [];

        // Visual updates
        itemEl.classList.add('shattered');
        const iconEl = itemEl.querySelector('.item-icon');
        if (iconEl) iconEl.textContent = '💥';
        
        const liquidDiv = itemEl.querySelector('.liquid-fill');
        if (liquidDiv) liquidDiv.style.height = '0%';

        window.logToExperiment(`HAZARD FAILURE: ${item.name} shattered due to ${reason}!`, 'hazard');

        if (itemEl.classList.contains('selected')) {
            updateTelemetry(item);
            updateRightPanelControls(item.name, itemId);
        }
    }

    // D. Splatter Warning Effect
    function triggerSpatterEffect(itemId) {
        const itemEl = document.getElementById(itemId);
        if (!itemEl) return;
        
        itemEl.style.boxShadow = '0 0 20px #ff4d4d';
        setTimeout(() => {
            if (!itemEl.classList.contains('shattered')) {
                itemEl.style.boxShadow = '';
            }
        }, 1000);
    }

    // E. Add "Stopper / Seal Container" Toggle to Container Controls
    const previousControlsWithSafety = updateRightPanelControls;
    updateRightPanelControls = function(itemName, itemId) {
        previousControlsWithSafety(itemName, itemId);
        const data = labState[itemId];

        if (data && data.isContainer && !data.isShattered) {
            const isSealed = data.isSealed || false;
            const stopperBtnHTML = `
                <div style="margin-top: 10px;">
                    <button id="seal-btn" class="danger-btn" style="background:${isSealed ? '#ff9900' : '#444'}; width:100%;">
                        ${isSealed ? '🔒 Sealed with Stopper' : '🔓 Open (Add Stopper)'}
                    </button>
                </div>
            `;
            activeControls.insertAdjacentHTML('beforeend', stopperBtnHTML);

            document.getElementById('seal-btn').addEventListener('click', () => {
                data.isSealed = !data.isSealed;
                window.logToExperiment(`${data.name} ${data.isSealed ? 'sealed with rubber stopper' : 'unsealed'}.`);
                updateRightPanelControls(itemName, itemId);
            });
        }
    };

});
