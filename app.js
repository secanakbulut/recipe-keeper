// recipe keeper - vanilla js, localStorage

const STORE_KEY = "recipe_keeper_v1";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

let recipes = load();

const views = {
  list: $("#listView"),
  form: $("#formView")
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
    ul.appendChild(li);
  }

  $("#emptyMsg").style.display = recipes.length ? "none" : "block";
}

// form

function openForm() {
  const form = $("#recipeForm");
  form.reset();
  const ingWrap = $("#ingredientRows");
  ingWrap.innerHTML = "";
  addIngRow();
  addIngRow();
  show("form");
}

function addIngRow(data) {
  const wrap = $("#ingredientRows");
  const row = document.createElement("div");
  row.className = "ing-row";
  row.innerHTML = `
    <input class="ing-amt" type="number" step="any" min="0" placeholder="amount" value="${data ? data.amount : ""}">
    <input class="ing-unit" type="text" placeholder="unit" value="${data ? data.unit || "" : ""}">
    <input class="ing-name" type="text" placeholder="ingredient" value="${data ? data.name || "" : ""}">
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
    id: uid(),
    title: form.title.value.trim(),
    servings: parseInt(form.servings.value, 10) || 1,
    time: parseInt(form.time.value, 10) || 0,
    tags,
    ingredients: ings,
    steps,
    createdAt: Date.now()
  };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// wire up

$("#newBtn").addEventListener("click", openForm);
$("#cancelBtn").addEventListener("click", () => show("list"));
$("#addIngBtn").addEventListener("click", () => addIngRow());

$("#recipeForm").addEventListener("submit", e => {
  e.preventDefault();
  const data = readForm();
  if (!data.title) return;
  recipes.unshift(data);
  save();
  renderList();
  show("list");
});

renderList();
