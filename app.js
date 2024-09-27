// recipe keeper - vanilla js, localStorage
// scale factor = new_servings / original_servings, applied to each ingredient amount

const STORE_KEY = "recipe_keeper_v1";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

let recipes = load();
let editingId = null;
let openId = null;

const views = {
  list: $("#listView"),
  form: $("#formView"),
  detail: $("#detailView")
};

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn("could not load recipes", e);
    return [];
  }
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(recipes));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// trim trailing zeros after rounding to 2dp.
// 1.50 -> "1.5", 2.00 -> "2", 0.333 -> "0.33"
function fmtAmount(n) {
  if (!isFinite(n)) return "";
  const r = Math.round(n * 100) / 100;
  let s = r.toFixed(2);
  if (s.indexOf(".") >= 0) {
    s = s.replace(/0+$/, "").replace(/\.$/, "");
  }
  return s;
}

function show(name) {
  for (const k in views) views[k].classList.add("hidden");
  views[name].classList.remove("hidden");
}

// list

function renderList() {
  const ul = $("#recipeList");
  ul.innerHTML = "";

  for (const r of recipes) {
    const li = document.createElement("li");
    li.dataset.id = r.id;
    li.innerHTML = `
      <h3>${escapeHtml(r.title)}</h3>
      <div class="meta">${r.servings} servings &middot; ${r.time || 0} min</div>
    `;
    li.addEventListener("click", () => openDetail(r.id));
    ul.appendChild(li);
  }

  $("#emptyMsg").style.display = recipes.length ? "none" : "block";
}

// form

function openForm(recipe) {
  editingId = recipe ? recipe.id : null;
  const form = $("#recipeForm");
  form.reset();
  $("#formTitle").textContent = recipe ? "edit recipe" : "new recipe";

  const ingWrap = $("#ingredientRows");
  ingWrap.innerHTML = "";

  if (recipe) {
    form.title.value = recipe.title;
    form.servings.value = recipe.servings;
    form.time.value = recipe.time || 0;
    form.tags.value = (recipe.tags || []).join(", ");
    form.steps.value = (recipe.steps || []).join("\n");
    (recipe.ingredients || []).forEach(addIngRow);
  } else {
    addIngRow();
    addIngRow();
  }

  show("form");
}

function addIngRow(data) {
  const wrap = $("#ingredientRows");
  const row = document.createElement("div");
  row.className = "ing-row";
  row.innerHTML = `
    <input class="ing-amt" type="number" step="any" min="0" placeholder="amount" value="${data ? data.amount : ""}">
    <input class="ing-unit" type="text" placeholder="unit" value="${data ? escapeAttr(data.unit || "") : ""}">
    <input class="ing-name" type="text" placeholder="ingredient" value="${data ? escapeAttr(data.name || "") : ""}">
    <button type="button" class="rm">x</button>
  `;
  row.querySelector(".rm").addEventListener("click", () => row.remove());
  wrap.appendChild(row);
}

function readForm() {
  const form = $("#recipeForm");
  const ings = $$(".ing-row", $("#ingredientRows")).map(row => ({
    amount: parseFloat(row.querySelector(".ing-amt").value) || 0,
    unit: row.querySelector(".ing-unit").value.trim(),
    name: row.querySelector(".ing-name").value.trim()
  })).filter(i => i.name);

  const tags = form.tags.value.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
  const steps = form.steps.value.split("\n").map(s => s.trim()).filter(Boolean);

  return {
    id: editingId || uid(),
    title: form.title.value.trim(),
    servings: parseInt(form.servings.value, 10) || 1,
    time: parseInt(form.time.value, 10) || 0,
    tags,
    ingredients: ings,
    steps,
    createdAt: editingId ? (recipes.find(r => r.id === editingId).createdAt) : Date.now()
  };
}

// detail

function openDetail(id) {
  const r = recipes.find(x => x.id === id);
  if (!r) return;
  openId = id;
  renderDetail(r, r.servings);
  show("detail");
}

function renderDetail(r, scaleServings) {
  const factor = scaleServings / r.servings;

  const ings = (r.ingredients || []).map(i => {
    const amt = i.amount ? fmtAmount(i.amount * factor) : "";
    const unit = i.unit || "";
    return `<li>${amt ? `<strong>${amt}</strong> ` : ""}${escapeHtml(unit)} ${escapeHtml(i.name)}</li>`;
  }).join("");

  const steps = (r.steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join("");
  const tagHtml = (r.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ");

  $("#detailBody").innerHTML = `
    <h2>${escapeHtml(r.title)}</h2>
    <div class="meta-line">${r.time || 0} min &middot; ${tagHtml}</div>

    <div class="scale-box">
      <label for="scaleInput">servings</label>
      <input id="scaleInput" type="number" min="1" step="1" value="${scaleServings}">
      <span class="scale-note">original: ${r.servings}${factor !== 1 ? ` (x${fmtAmount(factor)})` : ""}</span>
    </div>

    <h3>ingredients</h3>
    <ul class="ingredients">${ings}</ul>

    <h3>steps</h3>
    <ol class="steps">${steps}</ol>
  `;

  const inp = $("#scaleInput");
  if (inp) {
    inp.addEventListener("input", () => {
      const v = parseInt(inp.value, 10);
      if (v && v > 0) renderDetail(r, v);
    });
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

// wire up

$("#newBtn").addEventListener("click", () => openForm(null));
$("#cancelBtn").addEventListener("click", () => { editingId = null; show("list"); });
$("#addIngBtn").addEventListener("click", () => addIngRow());

$("#recipeForm").addEventListener("submit", e => {
  e.preventDefault();
  const data = readForm();
  if (!data.title) return;
  const idx = recipes.findIndex(r => r.id === data.id);
  if (idx >= 0) recipes[idx] = data;
  else recipes.unshift(data);
  save();
  editingId = null;
  renderList();
  show("list");
});

$("#backBtn").addEventListener("click", () => { openId = null; show("list"); });
$("#editBtn").addEventListener("click", () => {
  const r = recipes.find(x => x.id === openId);
  if (r) openForm(r);
});
$("#deleteBtn").addEventListener("click", () => {
  if (!openId) return;
  if (!confirm("delete this recipe?")) return;
  recipes = recipes.filter(r => r.id !== openId);
  save();
  openId = null;
  renderList();
  show("list");
});

renderList();
