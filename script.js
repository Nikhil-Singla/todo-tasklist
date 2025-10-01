// script.js

let data = { categories: [] };
let currentCategoryId = null;
const BADGE_COUNT = 16; // change to match number of badge images in Assets

/* -----------------------
   TASK COLORS
   ----------------------- */
const baseShades = [
  "#ff8a65",
  "#4dabf5",
  "#81c784",
  "#ffd54f",
  "#ba68c8",
  "#f06292",
  "#90a4ae",
];

// Fisher-Yates shuffle
function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* -----------------------
   PERSISTENCE: loadData()
   - Purpose: read saved app state from localStorage and populate `data`.
   - Inputs: none (reads "taskrpg" key from localStorage).
   - Outputs: sets the module-scoped `data` variable if saved data exists.
   - Side-effects: none beyond reading/parsing localStorage.
   - Notes: silently ignores parse errors (assumes valid JSON).
   ----------------------- */

function loadData() {
  const saved = localStorage.getItem("taskrpg");
  if (saved) data = JSON.parse(saved);
}

/* -----------------------
   PERSISTENCE: saveData()
   - Purpose: serialize current `data` and persist to localStorage.
   - Inputs: uses the module-scoped `data`.
   - Outputs: writes to localStorage key "taskrpg".
   - Side-effects: overwrites previous "taskrpg" value in localStorage.
   ----------------------- */
function saveData() {
  localStorage.setItem("taskrpg", JSON.stringify(data));
}

/* -----------------------
   ID GENERATION: generateId()
   - Purpose: create a simple (non-cryptographic) unique identifier for categories/tasks.
   - Inputs: none.
   - Outputs: returns a string based on the current timestamp.
   - Side-effects: none.
   - Notes: collisions are extremely unlikely in normal UI usage but possible if called multiple times in the same ms.
   ----------------------- */
function generateId() {
  return Date.now().toString();
}

/* -----------------------
   RENDER: renderBadges()
   - Purpose: display badges for the selected category with hover tooltips showing congratulations.
   - Inputs: currentCategoryId, data.categories.
   - Outputs: renders badges into #badgeCase and shows tooltip on hover.
   - Side-effects: attaches mouseenter/mouseleave events for tooltip positioning.
   ----------------------- */
function renderBadges() {
  const badgeCase = document.getElementById("badgeCase");
  if (!badgeCase) return;
  badgeCase.innerHTML = "";

  if (!currentCategoryId) return;

  const cat = data.categories.find((c) => c.id === currentCategoryId);
  if (!cat) return;

  for (let i = 0; i < BADGE_COUNT; i++) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("badge-tooltip");
    wrapper.style.position = "relative";


    
    const img = document.createElement("img");
    img.src = `Assets/badges/b${i + 1}.png`;
    img.alt = `Badge ${i + 1}`;

    if (cat.level >= i + 1) {
      img.classList.add("unlocked");

      // Tooltip element
      const tooltip = document.createElement("span");
      tooltip.classList.add("tooltip-text");
      tooltip.textContent = `🎉 Congratulations on unlocking Badge ${i + 1}!`;

      // Append tooltip to body for fixed positioning
      document.body.appendChild(tooltip);

      // Show tooltip on hover
      wrapper.addEventListener("mouseenter", () => {
        const rect = img.getBoundingClientRect();
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 6}px`; // above the badge
        tooltip.style.left = `${
          rect.left + rect.width / 2 - tooltip.offsetWidth / 2
        }px`;
        tooltip.style.visibility = "visible";
        tooltip.style.opacity = 1;
      });

      // Hide tooltip on mouse leave
      wrapper.addEventListener("mouseleave", () => {
        tooltip.style.visibility = "hidden";
        tooltip.style.opacity = 0;
      });
    }

    wrapper.appendChild(img);
    badgeCase.appendChild(wrapper);
  }
}

/* -----------------------
   RENDER: renderCategories()
   - Purpose: draw the category list in the left-hand UI.
   - Inputs: reads `data.categories` and `currentCategoryId`.
   - Outputs: updates the DOM element with id "categoryList".
   - Side-effects: attaches click handlers to each created list item that call selectCategory().
   ----------------------- */
function renderCategories() {
  const categoryList = document.getElementById("categoryList");
  categoryList.innerHTML = "";

  data.categories.forEach((cat) => {
    const li = document.createElement("li");
    li.dataset.id = cat.id;

    // Highlight if active
    li.classList.toggle("active", cat.id === currentCategoryId);

    // Category name (clickable to select/deselect)
    const span = document.createElement("span");
    span.textContent = cat.name;
    span.classList.add("category-name");
    span.addEventListener("click", () => selectCategory(cat.id));
    li.appendChild(span);

    // Container for icons
    const iconsDiv = document.createElement("div");
    iconsDiv.classList.add("category-icons");

    // Reload button (reset tasks in this category)
    const reloadBtn = document.createElement("img");
    reloadBtn.src = "Assets/icons/reload.png";
    reloadBtn.alt = "Reset tasks";
    reloadBtn.title = "Reset all tasks in this category"; // Tooltip
    reloadBtn.classList.add("icon-btn");
    reloadBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // don’t trigger selectCategory
      resetCategoryTasks(cat.id);
    });
    iconsDiv.appendChild(reloadBtn);

    // Trash button (delete category)
    const trashBtn = document.createElement("img");
    trashBtn.src = "Assets/icons/trash.png";
    trashBtn.alt = "Delete category";
    trashBtn.title = "Delete this category"; // Tooltip
    trashBtn.classList.add("icon-btn");
    trashBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteCategory(cat.id);
    });
    iconsDiv.appendChild(trashBtn);

    li.appendChild(iconsDiv);
    categoryList.appendChild(li);
  });
}

/* -----------------------
   MUTATION: resetCategoryTasks(categoryId)
   - Purpose: reset all tasks in a given category back to undone.
   - Inputs: categoryId (string) – the id of the category to reset.
   - Outputs: modifies each task.done = false inside the category.
   - Side-effects: persists changes to localStorage; re-renders task list.
   - Notes: does not remove XP or affect other categories.
   ----------------------- */
function resetCategoryTasks(categoryId) {
  const cat = data.categories.find((c) => c.id === categoryId);
  if (!cat) return;
  let changed = false;
  cat.tasks.forEach((task) => {
    if (task.done) {
      task.done = false;
      changed = true;
    }
  });
  if (changed) {
    saveData();
    renderTasks();
  }
}

/* -----------------------
   MUTATION: deleteCategory(categoryId)
   - Purpose: remove an entire category and its tasks from the data.
   - Inputs: categoryId (string) – the id of the category to delete.
   - Outputs: filters `data.categories` to exclude the target.
   - Side-effects: prompts user confirmation; clears currentCategoryId
                  if the deleted one was selected; persists changes and
                  re-renders categories, tasks, and progress.
   - Notes: irreversible client-side deletion; no server state affected.
   ----------------------- */
function deleteCategory(categoryId) {
  if (
    !confirm("Are you sure you want to delete this category and all its tasks?")
  )
    return;

  data.categories = data.categories.filter((c) => c.id !== categoryId);

  // If the deleted category was selected, clear selection
  if (currentCategoryId === categoryId) {
    currentCategoryId = null;
  }

  saveData();
  renderCategories();
  renderTasks();
  renderProgress();
}

/* -----------------------
   NAVIGATION: selectCategory(id)
   - Purpose: set the active category for the UI and update visible details.
   - Inputs: id (string) - the category id to select.
   - Outputs: updates module-scoped `currentCategoryId`.
   - Side-effects: re-renders categories, tasks, and progress displays.
   ----------------------- */
function selectCategory(id) {
  currentCategoryId = id;
  renderCategories();
  renderTasks();
  renderProgress();
  renderBadges();
}

/* -----------------------
   MUTATION: addCategory()
   - Purpose: create a new category from the UI input and persist it.
   - Inputs: reads the #newCategoryInput element value.
   - Outputs: appends a new category object to `data.categories`.
   - Side-effects: saves to localStorage, clears the input, and re-renders category list.
   - Validation: ignores empty/whitespace-only names.
   ----------------------- */
function addCategory() {
  const input = document.getElementById("newCategoryInput");
  const name = input.value.trim();
  if (!name) return;

  const cat = {
    id: generateId(),
    name: name,
    tasks: [],
    xp: 0,
    level: 1,
    colorOrder: shuffleArray(baseShades), // shuffled shades for this category
    colorIndex: 0, // current position in the cycle
  };

  data.categories.push(cat);
  saveData();
  input.value = "";
  renderCategories();
}

/* -----------------------
   RENDER: renderTasks()
   - Purpose: show tasks for the currently selected category in the main pane.
   - Inputs: reads `currentCategoryId` and `data.categories`.
   - Outputs: updates #categoryTitle and #taskList in the DOM.
   - Side-effects: attaches click handlers to task items that toggle completion via toggleTask().
   - Edge-cases: if no category selected, clears task list and prompts user.
   ----------------------- */
function renderTasks() {
  const title = document.getElementById("categoryTitle");
  const taskList = document.getElementById("taskList");
  if (!currentCategoryId) {
    title.textContent = "Select or add a category";
    taskList.innerHTML = "";
    return;
  }
  const cat = data.categories.find((c) => c.id === currentCategoryId);
  title.textContent = cat.name;
  taskList.innerHTML = "";
  cat.tasks.forEach((task) => {
    const li = document.createElement("li");
    li.textContent = task.text;
    li.dataset.id = task.id;

    // Apply stored color
    if (task.color) {
      li.style.borderLeft = `6px solid ${task.color}`;
    }

    if (task.done) li.classList.add("completed");

    if (task.daily) {
      const span = document.createElement("span");
      span.textContent = " (Daily)";
      span.style.color = "green";
      li.appendChild(span);
    }
    li.addEventListener("click", () => toggleTask(task.id));
    taskList.appendChild(li);
  });
}

/* -----------------------
   MUTATION: addTask()
   - Purpose: add a new task under the currently selected category.
   - Inputs: reads #newTaskInput and #newTaskDaily checkbox; requires currentCategoryId to be set.
   - Outputs: pushes a new task object into the category's tasks array.
   - Side-effects: saves data to localStorage, clears inputs, re-renders tasks.
   - Validation: ignores empty task text or when no category is selected.
   ----------------------- */
function addTask() {
  const input = document.getElementById("newTaskInput");
  const dailyCheckbox = document.getElementById("newTaskDaily");
  const text = input.value.trim();
  if (!text || !currentCategoryId) return;

  const cat = data.categories.find((c) => c.id === currentCategoryId);

  // Pick color from category's order
  const color = cat.colorOrder[cat.colorIndex];
  cat.colorIndex = (cat.colorIndex + 1) % cat.colorOrder.length;

  const task = {
    id: generateId(),
    text: text,
    done: false,
    daily: dailyCheckbox.checked,
    lastCompleted: null,
    color: color,
  };

  cat.tasks.push(task);
  saveData();
  input.value = "";
  dailyCheckbox.checked = false;
  renderTasks();
}

/* -----------------------
   UI: showLevelUpPopup()
   - Purpose: Display a popup with confetti and a dismiss button on level up.
   - Inputs: category name and new level.
   - Outputs: Shows a modal popup and runs confetti animation.
   - Side-effects: Pauses background interaction until popup is closed.
   ----------------------- */
function showLevelUpPopup(categoryName, level) {
  const popup = document.getElementById("levelUpPopup");
  const message = document.getElementById("popupMessage");
  const closeBtn = document.getElementById("closePopupBtn");

  message.textContent = `🎉 Congratulations! "${categoryName}" reached level ${level}! 🎉`;
  popup.style.display = "flex";
  popup.setAttribute("aria-hidden", "false");

  // Start confetti
  startConfetti();

  // Close popup function
  function closePopup() {
    popup.style.display = "none";
    popup.setAttribute("aria-hidden", "true");
    stopConfetti();
    // Remove event listeners after close
    popup.removeEventListener("click", outsideClickHandler);
    closeBtn.removeEventListener("click", closePopup);
  }

  // Close on button click
  closeBtn.addEventListener("click", closePopup);

  // Close when clicking outside the popup-content
  function outsideClickHandler(e) {
    if (e.target === popup) {
      closePopup();
    }
  }
  popup.addEventListener("click", outsideClickHandler);
}

/* -----------------------
   UI: startConfetti()
   - Purpose: Begin a lightweight confetti animation on the screen.
   - Inputs: None.
   - Outputs: Animates colorful confetti falling across the viewport.
   - Side-effects: Continuously updates a canvas element until stopped.
   ----------------------- */
let confettiInterval;
function startConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const confetti = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 6 + 4,
    d: Math.random() * 150,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    tilt: Math.floor(Math.random() * 10) - 10,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confetti.forEach((c, i) => {
      ctx.beginPath();
      ctx.lineWidth = c.r;
      ctx.strokeStyle = c.color;
      ctx.moveTo(c.x + c.tilt + c.r / 2, c.y);
      ctx.lineTo(c.x + c.tilt, c.y + c.r / 2);
      ctx.stroke();
    });
    update();
  }

  function update() {
    confetti.forEach((c) => {
      c.y += Math.cos(c.d) + 2 + c.r / 2;
      c.x += Math.sin(c.d);
      if (c.y > canvas.height) {
        c.x = Math.random() * canvas.width;
        c.y = -10;
      }
    });
  }

  confettiInterval = setInterval(draw, 20);
}

/* -----------------------
   UI: stopConfetti()
   - Purpose: Stop the confetti animation and clear the canvas.
   - Inputs: None.
   - Outputs: Clears the confetti canvas and halts animation.
   - Side-effects: Removes all visual confetti from the screen.
   ----------------------- */
function stopConfetti() {
  clearInterval(confettiInterval);
  const canvas = document.getElementById("confettiCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* -----------------------
   MUTATION: toggleTask(taskId)
   - Purpose: toggle a task between done/undone; award XP when marking done.
   - Inputs: taskId (string) identifying the task within the current category.
   - Outputs: updates task.done, task.lastCompleted, category xp/level as needed.
   - Side-effects: persists changes, re-renders tasks and progress; may show alert on level up.
   - Rules: marking done increments xp by 1; level up occurs when xp >= level * 5.
   ----------------------- */
function toggleTask(taskId) {
  const cat = data.categories.find((c) => c.id === currentCategoryId);
  const task = cat.tasks.find((t) => t.id === taskId);

  if (!task) return;
  if (!task.done) {
    // Mark task done
    task.done = true;
    task.lastCompleted = new Date().toDateString();
    cat.xp++;

    // Check for level up (every 5 XP per level)
    const xpForNext = cat.level * 5;

    if (cat.xp >= xpForNext) {
      cat.level++;
      showLevelUpPopup(cat.name, cat.level);
      unlockSkins(cat.level);
    }
  } else {
    // Uncheck task (done -> undone); no XP deduction by design
    task.done = false;
  }
  saveData();
  renderTasks();
  renderProgress();
  renderBadges();
}

/* -----------------------
   RENDER: renderProgress()
   - Purpose: update the level and XP indicators in the UI for the current category, using a horizontal XP bar.
   - Inputs: uses `currentCategoryId` to find the category object and read level/xp.
   - Outputs: writes to #levelDisplay, #xpDisplay, #nextLevelXP, and sets #xpBar width.
   - Side-effects: updates aria-valuenow on the progress container for accessibility.
   - Edge-cases: does nothing when no category is selected.
   ----------------------- */
function renderProgress() {
  if (!currentCategoryId) return;
  const cat = data.categories.find((c) => c.id === currentCategoryId);
  document.getElementById("levelDisplay").textContent = cat.level;
  document.getElementById("xpDisplay").textContent = cat.xp;
  const xpForNext = cat.level * 5;
  document.getElementById("nextLevelXP").textContent = xpForNext;

  // Compute percentage fill for the XP bar (cap at 100)
  const percent = Math.min(100, Math.round((cat.xp / xpForNext) * 100));
  const xpBar = document.getElementById("xpBar");
  if (xpBar) xpBar.style.width = percent + "%";

  // Update progressbar aria value (optional)
  const bar = document.querySelector(".xp-bar");
  if (bar) bar.setAttribute("aria-valuenow", percent.toString());
}

/* -----------------------
   UNLOCKS: unlockSkins(level)
   - Purpose: enable UI skin options based on category level milestones.
   - Inputs: level (number) - the newly reached level.
   - Outputs: manipulates the DOM <option> disabled property for available skins.
   - Side-effects: toggles availability of the "dark" option when level >= 2.
   - Notes: This is UI-only; actual style changes are applied via changeSkin().
   ----------------------- */
function unlockSkins(level) {
  const skinSelector = document.getElementById("skinSelector");
  if (!skinSelector) return;
  // Example: unlock 'Dark' theme at level 2
  if (level >= 2) {
    const option = document.querySelector('#skinSelector option[value="dark"]');
    if (option) option.disabled = false;
  }
}

/* -----------------------
   UI: changeSkin()
   - Purpose: apply the selected skin by toggling a CSS class on <body>.
   - Inputs: reads value of #skinSelector.
   - Outputs: sets document.body.className to "skin-<value>" or clears it.
   - Side-effects: affects page appearance via CSS.
   ----------------------- */
function changeSkin() {
  const skin = document.getElementById("skinSelector").value;
  document.body.className = skin ? "skin-" + skin : "";
}

/* -----------------------
   DAILY MAINTENANCE: dailyResetCheck()
   - Purpose: reset tasks that are marked "daily" if they were completed on a prior day.
   - Inputs: compares each task.lastCompleted to today's date string.
   - Outputs: sets task.done = false for daily tasks not completed today.
   - Side-effects: persists changes and re-renders tasks if any were reset.
   - Notes: idempotent if called multiple times on the same day.
   ----------------------- */
function dailyResetCheck() {
  const today = new Date().toDateString();
  let changed = false;
  data.categories.forEach((cat) => {
    cat.tasks.forEach((task) => {
      if (task.daily && task.done && task.lastCompleted !== today) {
        task.done = false;
        changed = true;
      }
    });
  });
  if (changed) {
    saveData();
    renderTasks();
  }
}

/* -----------------------
   RESET: resetAll()
   - Purpose: clear application data from localStorage/sessionStorage and do a full page reload.
   - Inputs: none.
   - Outputs: removes "taskrpg" key from localStorage and clears sessionStorage.
   - Side-effects: forces a location.reload() which resets in-memory state and the UI.
   - Notes: this is a hard reset for client-side state (does not affect HttpOnly cookies or server state).
   ----------------------- */
function resetAll() {
  // Clear app storage
  localStorage.removeItem("taskrpg"); // remove app data
  // Optionally clear sessionStorage
  sessionStorage.clear();
  // Reload to start fresh
  location.reload();
}

/* -----------------------
   RESET: dailyResetNow()
   - Purpose: force all daily tasks back to undone.
   - Inputs: none.
   - Outputs: modifies task.done for daily tasks.
   - Side-effects: persists to storage, re-renders tasks.
   ----------------------- */
function dailyResetNow() {
  let changed = false;
  data.categories.forEach((cat) => {
    cat.tasks.forEach((task) => {
      if (task.daily && task.done) {
        task.done = false;
        changed = true;
      }
    });
  });
  if (changed) {
    saveData();
    renderTasks();
  }
}

/* -----------------------
   BOOTSTRAP: init()
   - Purpose: initialize the app on DOMContentLoaded: load data, bind UI handlers, and render initial state.
   - Inputs: none (reads DOM elements by id).
   - Outputs: registers event listeners and triggers initial render functions.
   - Side-effects: attaches listeners to skin selector, add buttons, and reset button; runs daily reset check.
   ----------------------- */

function init() {
  loadData();
  document
    .getElementById("skinSelector")
    .addEventListener("change", changeSkin);
  document
    .getElementById("addCategoryBtn")
    .addEventListener("click", addCategory);
  document.getElementById("addTaskBtn").addEventListener("click", addTask);

  // Reset button hook
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.addEventListener("click", resetAll);

  const dailyResetBtn = document.getElementById("dailyResetBtn");
  if (dailyResetBtn) {
    dailyResetBtn.addEventListener("click", function (e) {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      dailyResetNow();
    });
  }

  renderCategories();
  renderBadges();
  renderTasks();
  renderProgress();
  dailyResetCheck();
}

document.addEventListener("DOMContentLoaded", init);
