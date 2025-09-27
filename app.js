// Pulse Planner – app.js
(function(){
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const todayISO = new Date().toISOString().slice(0,10);
  const STORAGE_KEY = "pulse.tasks." + todayISO;
  const STREAK_KEY = "pulse.streak";
  const EGG_SEEN_PREFIX = "egg-seen-";
  const EGG_COOLDOWN_KEY = "egg-cooldown";
  const MAX_TASKS = 60;

  const state = {
    tasks: loadTasks(),
    tripleTap: {count:0, timer:null},
    installPrompt: null
  };

  // --------- Init ---------
  updateDateChip();
  renderAll();
  bindEvents();
  registerSW();
  setupInstallPrompt();

  // --------- Functions ---------
  function loadTasks(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }catch(e){}
    // Seed defaults
    return [
      { id: uid(), text: "Daily planning session", done: false },
      { id: uid(), text: "Top 3 priorities", done: false },
      { id: uid(), text: "Deep work block", done: false },
      { id: uid(), text: "Review & wrap", done: false }
    ];
  }

  function saveTasks(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  }

  function uid(){ return Math.random().toString(36).slice(2,9); }

  function updateDateChip(){
    const d = new Date();
    const fmt = d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
    $("#dateChip").textContent = fmt;
  }

  function renderAll(){
    renderList();
    updateCountsAndProgress();
    updateStreakChip();
  }

  function renderList(){
    const ul = $("#taskList");
    ul.innerHTML = "";
    state.tasks.forEach(t => {
      const li = document.createElement("li");
      li.className = "item" + (t.done ? " done" : "");
      li.dataset.id = t.id;
      li.innerHTML = `
        <label class="switch">
          <input type="checkbox" ${t.done ? "checked": ""} aria-label="Toggle ${escapeHTML(t.text)}">
          <span class="track"></span>
          <span class="ball"></span>
        </label>
        <div class="txt">${escapeHTML(t.text)}</div>
        <button class="del" aria-label="Delete ${escapeHTML(t.text)}">Delete</button>
      `;
      ul.appendChild(li);
    });
  }

  function escapeHTML(s){ return s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function updateCountsAndProgress(){
    const total = state.tasks.length;
    const done = state.tasks.filter(t => t.done).length;
    $("#countsLabel").textContent = `${done} of ${total} done`;
    const pct = total ? Math.round((done/total)*100) : 0;
    $("#progressBar").style.width = pct + "%";

    // Egg trigger if all done
    if (total > 0 && done === total) {
      maybeTriggerEgg();
      // streak updates
      incStreakOncePerDay();
    }
  }

  function updateStreakChip(){
    const streak = Number(localStorage.getItem(STREAK_KEY) || 0);
    $("#streakChip").textContent = `🔥 ${streak}`;
  }

  function incStreakOncePerDay(){
    const markKey = "streak-mark-" + todayISO;
    if (localStorage.getItem(markKey)) return;
    localStorage.setItem(markKey, "1");
    const streak = Number(localStorage.getItem(STREAK_KEY) || 0) + 1;
    localStorage.setItem(STREAK_KEY, String(streak));
    updateStreakChip();
  }

  function bindEvents(){
    $("#addForm").addEventListener("submit", (e)=>{
      e.preventDefault();
      const input = $("#addInput");
      const txt = (input.value || "").trim();
      if (!txt) return;
      if (state.tasks.length >= MAX_TASKS) { alert("Max tasks reached."); return; }
      state.tasks.push({ id: uid(), text: txt, done: false });
      input.value = "";
      saveTasks(); renderAll();
    });

    $("#taskList").addEventListener("click", (e)=>{
      const li = e.target.closest(".item");
      if (!li) return;
      const id = li.dataset.id;
      if (e.target.matches("input[type=checkbox]")) {
        const t = state.tasks.find(t => t.id === id);
        if (t){ t.done = e.target.checked; saveTasks(); renderAll(); }
      }
      if (e.target.matches(".del")) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        saveTasks(); renderAll();
      }
    });

    $("#clearDoneBtn").addEventListener("click", ()=>{
      if (!state.tasks.some(t=>t.done)) return;
      state.tasks = state.tasks.filter(t => !t.done);
      saveTasks(); renderAll();
    });

    $("#resetBtn").addEventListener("click", ()=>{
      if (confirm("Reset today's list?")) {
        localStorage.removeItem(STORAGE_KEY);
        state.tasks = loadTasks();
        saveTasks(); renderAll();
      }
    });

    // Secret triple-tap on header
    $("#appHeader").addEventListener("click", ()=>{
      state.tripleTap.count++;
      clearTimeout(state.tripleTap.timer);
      state.tripleTap.timer = setTimeout(()=>{ state.tripleTap.count = 0; }, 1200);
      if (state.tripleTap.count >= 3){
        state.tripleTap.count = 0;
        triggerEgg();
      }
    });

    // Egg close
    $("#eggCloseBtn").addEventListener("click", hideEgg);
    $("#eggOverlay").addEventListener("click", (e)=>{
      if (e.target.id === "eggOverlay") hideEgg();
    });
  }

  // ------------- Easter Egg -------------
  function maybeTriggerEgg(){
    const todayMark = EGG_SEEN_PREFIX + todayISO;
    if (localStorage.getItem(todayMark)) return;
    localStorage.setItem(todayMark, "1");
    triggerEgg();
  }

  function triggerEgg(){
    // cooldown 2 min
    const last = Number(localStorage.getItem(EGG_COOLDOWN_KEY) || 0);
    if (Date.now() - last < 2 * 60 * 1000) return;
    localStorage.setItem(EGG_COOLDOWN_KEY, String(Date.now()));
    showEgg();
  }

  function showEgg(){
    const ov = $("#eggOverlay");
    ov.classList.remove("hidden");
    // generate confetti dots
    const wrap = ov.querySelector(".confetti");
    wrap.innerHTML = "";
    const N = 28;
    for (let i=0;i<N;i++){
      const dot = document.createElement("span");
      dot.className = "dot";
      const hue = (i*47) % 360;
      dot.style.background = `hsl(${hue} 90% 60%)`;
      dot.style.left = ((i*37)%100) + "%";
      dot.style.top = ((i*53)%100) + "%";
      dot.style.animationDelay = (i%6)*60 + "ms";
      wrap.appendChild(dot);
    }
    // auto close
    clearTimeout(showEgg._t);
    showEgg._t = setTimeout(hideEgg, 3600);
  }

  function hideEgg(){
    $("#eggOverlay").classList.add("hidden");
  }

  // ------------- PWA bits -------------
  function registerSW(){
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(()=>{});
    }
  }

  function setupInstallPrompt(){
    const btn = $("#installBtn");
    window.addEventListener("beforeinstallprompt", (e)=>{
      e.preventDefault();
      state.installPrompt = e;
      btn.hidden = false;
    });
    btn.addEventListener("click", async ()=>{
      if (!state.installPrompt) return;
      state.installPrompt.prompt();
      await state.installPrompt.userChoice;
      state.installPrompt = null;
      btn.hidden = true;
    });
  }

})();