const COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#db2777", "#f79009", "#12b76a"];
const TYPE_LABEL = { tarefa: "Tarefa", trabalho: "Trabalho", prova: "Prova" };
const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const state = {
  token: localStorage.getItem("st_token"),
  user: null,
  view: "inicio",
  filtro: "todas",
  hoje: null,
  disciplinas: [],
  tarefas: [],
  metas: [],
  turmas: [],
};

const $ = (sel) => document.querySelector(sel);

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// ---------- API ----------
async function api(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(state.token ? { authorization: `Bearer ${state.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && state.token) {
    logout();
    throw new Error("Sua sessão expirou. Entre novamente.");
  }
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(data?.error || "Não foi possível completar a ação.");
  return data;
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.add("hidden"), 2600);
}

// ---------- dates ----------
function daysUntil(date) {
  const target = new Date(`${date}T12:00:00Z`);
  const today = new Date(`${state.hoje}T12:00:00Z`);
  return Math.round((target - today) / 86400000);
}

function dateBR(date) {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

function longToday() {
  const d = new Date(`${state.hoje}T12:00:00Z`);
  const wd = WEEKDAYS[d.getUTCDay()];
  return `${wd[0].toUpperCase()}${wd.slice(1)}, ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}

function deadlineBadge(t) {
  if (t.concluida) return { txt: "Concluída", cls: "ok" };
  const d = daysUntil(t.data_limite);
  if (d < 0) return { txt: "Atrasada", cls: "late" };
  if (d === 0) return { txt: "Hoje", cls: "late" };
  if (d <= 3) return { txt: `${d} dia${d > 1 ? "s" : ""}`, cls: "warn" };
  return { txt: `${d} dias`, cls: "ok" };
}

// ---------- auth ----------
let signupMode = false;

function setAuthMode(signup) {
  signupMode = signup;
  $("#signup-fields").classList.toggle("hidden", !signup);
  $("#auth-submit").textContent = signup ? "Criar conta" : "Entrar";
  $("#auth-switch-label").textContent = signup ? "Já tem conta?" : "Não tem conta?";
  $("#auth-switch").textContent = signup ? "Entrar" : "Cadastre-se";
  $("#a-senha").autocomplete = signup ? "new-password" : "current-password";
  $("#auth-erro").classList.add("hidden");
}

async function submitAuth(e) {
  e.preventDefault();
  const body = { email: $("#a-email").value.trim(), senha: $("#a-senha").value };
  if (signupMode) Object.assign(body, { nome: $("#a-nome").value.trim(), curso: $("#a-curso").value.trim() });
  try {
    const res = await api("POST", signupMode ? "/auth/cadastro" : "/auth/login", body);
    state.token = res.token;
    localStorage.setItem("st_token", res.token);
    state.user = res.usuario;
    $("#a-senha").value = "";
    await enterApp();
  } catch (err) {
    $("#auth-erro").textContent = err.message;
    $("#auth-erro").classList.remove("hidden");
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("st_token");
  $("#app").classList.add("hidden");
  $("#auth").classList.remove("hidden");
  setAuthMode(false);
}

async function enterApp() {
  if (!state.user) state.user = await api("GET", "/auth/me");
  const initials = state.user.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  $("#u-avatar").textContent = initials;
  $("#u-nome").textContent = state.user.nome;
  $("#u-curso").textContent = state.user.curso || state.user.email;
  $("#auth").classList.add("hidden");
  $("#app").classList.remove("hidden");
  await go(location.hash.slice(1) || "inicio");
}

// ---------- navigation ----------
const VIEWS = {
  inicio: { title: "Início", sub: () => longToday(), action: "+ Nova tarefa", onAction: () => taskForm() },
  tarefas: { title: "Tarefas", sub: () => "Trabalhos, provas e atividades com prazo", action: "+ Nova tarefa", onAction: () => taskForm() },
  disciplinas: { title: "Disciplinas", sub: () => `${state.disciplinas.length} disciplina(s) cadastrada(s)`, action: "+ Nova disciplina", onAction: () => disciplinaForm() },
  metas: { title: "Metas", sub: () => "Quantas tarefas você quer concluir até uma data", action: "+ Nova meta", onAction: () => metaForm() },
  turmas: { title: "Turmas", sub: () => "Atividades compartilhadas pelo representante", action: "+ Criar turma", onAction: () => turmaForm() },
};

async function go(view) {
  if (!VIEWS[view]) view = "inicio";
  state.view = view;
  history.replaceState(null, "", `#${view}`);
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  $(`#view-${view}`).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  $("#primary-action").textContent = VIEWS[view].action;
  await refresh();
}

async function refresh() {
  try {
    const [dash, disciplinas, tarefas, metas, turmas] = await Promise.all([
      api("GET", "/dashboard"),
      api("GET", "/disciplinas"),
      api("GET", "/tarefas"),
      api("GET", "/metas"),
      api("GET", "/turmas"),
    ]);
    Object.assign(state, { hoje: dash.resumo.hoje, dash, disciplinas, tarefas, metas, turmas });
    $("#page-title").textContent = VIEWS[state.view].title;
    $("#page-sub").textContent = VIEWS[state.view].sub();
    renderInicio();
    renderTarefas();
    renderDisciplinas();
    renderMetas();
    await renderTurmas();
  } catch (err) {
    toast(err.message);
  }
}

// ---------- render: tasks ----------
function taskItem(t) {
  const b = deadlineBadge(t);
  const origin = t.turma_nome
    ? `<i class="tag">Turma · ${esc(t.turma_nome)}</i>`
    : t.disciplina_nome
      ? `<i class="dot" style="background:${esc(t.disciplina_cor)}"></i>${esc(t.disciplina_nome)}`
      : "Sem disciplina";
  const actions = t.origem === "pessoal"
    ? `<button class="icon-btn" data-action="edit-task" data-id="${t.id}" title="Editar">✎</button>
       <button class="icon-btn" data-action="delete-task" data-id="${t.id}" title="Excluir">✕</button>`
    : "";
  return `<li class="task ${t.concluida ? "done" : ""}">
      <button class="check" data-action="toggle-task" data-id="${t.id}" aria-label="Marcar como concluída">✓</button>
      <div class="task-info">
        <strong>${esc(t.titulo)}</strong>
        <span><b class="type type-${t.tipo}">${TYPE_LABEL[t.tipo]}</b> ${origin} · entrega ${dateBR(t.data_limite)}</span>
      </div>
      <div class="badge ${b.cls}">${b.txt}</div>
      <div class="row-actions">${actions}</div>
    </li>`;
}

const empty = (msg) => `<p class="empty">${msg}</p>`;

function renderInicio() {
  const r = state.dash.resumo;
  $("#st-abertas").textContent = r.abertas;
  $("#st-concluidas").textContent = r.concluidas;
  $("#st-vencendo").textContent = r.vencendo;
  $("#st-atrasadas").textContent = r.atrasadas;

  const abertas = state.tarefas.filter((t) => !t.concluida).slice(0, 5);
  $("#proximos").innerHTML = abertas.length ? abertas.map(taskItem).join("") : empty("Nada pendente. Cadastre sua próxima tarefa.");

  const porDisc = state.dash.porDisciplina;
  $("#barras").innerHTML = porDisc.length
    ? porDisc.map((d) => {
        const pct = d.total ? Math.round((d.feitas / d.total) * 100) : 0;
        return `<div class="barra-item">
            <div class="barra-top"><span>${esc(d.nome)}</span><span>${d.feitas}/${d.total} · ${pct}%</span></div>
            <div class="bar"><div style="width:${pct}%;background:${esc(d.cor)}"></div></div>
          </div>`;
      }).join("")
    : empty("Cadastre suas disciplinas para ver o progresso de cada uma.");

  const total = r.abertas + r.concluidas;
  const pct = total ? Math.round((r.concluidas / total) * 100) : 0;
  $("#ring-label").textContent = `${pct}%`;
  $("#ring-done").textContent = r.concluidas;
  $("#ring-total").textContent = total;
  $("#ring").style.background = `conic-gradient(var(--brand) ${pct * 3.6}deg, #eef2f7 0)`;

  const max = Math.max(1, ...state.dash.semanas.map((s) => s.concluidas));
  $("#chart").innerHTML = state.dash.semanas
    .map((s, i, all) => `<div class="chart-col">
        <span class="chart-val">${s.concluidas}</span>
        <div class="b ${i === all.length - 1 ? "" : "soft"}" style="height:${(s.concluidas / max) * 100}%"></div>
        <small>${i === all.length - 1 ? "Esta" : dateBR(s.inicio)}</small>
      </div>`)
    .join("");
}

function renderTarefas() {
  const list = state.tarefas.filter((t) =>
    state.filtro === "abertas" ? !t.concluida : state.filtro === "concluidas" ? t.concluida : true
  );
  $("#tarefas-lista").innerHTML = list.length ? list.map(taskItem).join("") : empty("Nenhuma tarefa neste filtro.");
}

// ---------- render: disciplines ----------
function renderDisciplinas() {
  $("#disciplinas-grid").innerHTML = state.disciplinas.length
    ? state.disciplinas.map((d) => {
        const pct = d.total_tarefas ? Math.round((d.tarefas_concluidas / d.total_tarefas) * 100) : 0;
        return `<div class="materia" style="border-top-color:${esc(d.cor)}">
            <h4>${esc(d.nome)}</h4>
            <p class="prof">${esc(d.professor || "Professor não informado")}${d.periodo ? ` · ${esc(d.periodo)}` : ""}</p>
            <div class="meta"><span>${d.total_tarefas} tarefa(s)</span><span>${pct}% concluído</span></div>
            <div class="bar"><div style="width:${pct}%;background:${esc(d.cor)}"></div></div>
            <div class="acoes">
              <button data-action="edit-disc" data-id="${d.id}">Editar</button>
              <button data-action="delete-disc" data-id="${d.id}">Excluir</button>
            </div>
          </div>`;
      }).join("")
    : empty("Você ainda não cadastrou disciplinas. Comece pelas matérias do semestre.");
}

// ---------- render: goals ----------
function renderMetas() {
  $("#metas-grid").innerHTML = state.metas.length
    ? state.metas.map((m) => {
        const status = m.atingida ? ["ok", "Atingida"] : m.encerrada ? ["late", "Encerrada"] : ["warn", `até ${dateBR(m.prazo)}`];
        return `<div class="materia" style="border-top-color:${esc(m.disciplina_cor || "#2563eb")}">
            <div class="row-between"><h4>${esc(m.titulo)}</h4><span class="badge ${status[0]}">${status[1]}</span></div>
            <p class="prof">${m.disciplina_nome ? esc(m.disciplina_nome) : "Todas as disciplinas"} · desde ${dateBR(m.inicio)}</p>
            <div class="meta"><span>${m.feitas} de ${m.alvo} tarefas</span><span>${m.percentual}%</span></div>
            <div class="bar"><div style="width:${m.percentual}%;background:${esc(m.disciplina_cor || "#2563eb")}"></div></div>
            <div class="acoes"><button data-action="delete-meta" data-id="${m.id}">Excluir meta</button></div>
          </div>`;
      }).join("")
    : empty("Defina uma meta, por exemplo: concluir 5 tarefas até sexta.");
}

// ---------- render: classes ----------
async function renderTurmas() {
  if (!state.turmas.length) {
    $("#turmas-lista").innerHTML = empty("Você ainda não participa de nenhuma turma.");
    return;
  }
  const blocks = await Promise.all(
    state.turmas.map(async (t) => {
      const isRep = t.papel === "representante";
      const [atividades, membros] = await Promise.all([
        api("GET", `/turmas/${t.id}/atividades`),
        isRep ? api("GET", `/turmas/${t.id}/membros`) : Promise.resolve([]),
      ]);
      const atv = atividades.length
        ? atividades.map((a) => `<li class="task">
              <div class="task-info">
                <strong>${esc(a.titulo)}</strong>
                <span><b class="type type-${a.tipo}">${TYPE_LABEL[a.tipo]}</b> entrega ${dateBR(a.data_limite)} · ${a.concluidas}/${a.enviadas} concluíram</span>
              </div>
              ${isRep ? `<div class="row-actions">
                <button class="icon-btn" data-action="edit-atv" data-turma="${t.id}" data-id="${a.id}" title="Editar">✎</button>
                <button class="icon-btn" data-action="delete-atv" data-turma="${t.id}" data-id="${a.id}" title="Excluir">✕</button>
              </div>` : ""}
            </li>`).join("")
        : empty("Nenhuma atividade publicada ainda.");
      const repPanel = isRep
        ? `<div class="code-box">Código de acesso: <strong>${esc(t.codigo)}</strong><span>Compartilhe só com a sua sala.</span></div>
           <h5>Membros (${membros.length})</h5>
           <table class="members"><thead><tr><th>Aluno</th><th>Papel</th><th>Atividades concluídas</th></tr></thead><tbody>
             ${membros.map((m) => `<tr><td>${esc(m.nome)}</td><td>${m.papel}</td><td>${m.concluidas}/${m.atividades}</td></tr>`).join("")}
           </tbody></table>`
        : "";
      return `<div class="panel turma">
          <div class="panel-head">
            <div><h3>${esc(t.nome)}</h3><p class="prof">Representante: ${esc(t.representante_nome)} · ${t.total_membros} membro(s)</p></div>
            <div class="head-actions">
              <span class="badge ${isRep ? "warn" : "ok"}">${isRep ? "Representante" : "Aluno"}</span>
              ${isRep
                ? `<button class="btn-primary sm" data-action="new-atv" data-turma="${t.id}">+ Publicar atividade</button>`
                : `<button class="btn-ghost sm" data-action="leave-turma" data-turma="${t.id}">Sair</button>`}
            </div>
          </div>
          ${repPanel}
          <h5>Atividades da turma</h5>
          <ul class="task-list">${atv}</ul>
        </div>`;
    })
  );
  $("#turmas-lista").innerHTML = blocks.join("");
}

// ---------- modal forms ----------
let modalSubmit = null;

function field(f) {
  const common = `id="m-${f.name}" name="${f.name}" ${f.required ? "required" : ""}`;
  if (f.type === "select") {
    return `<label for="m-${f.name}">${f.label}</label><select ${common}>${f.options
      .map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(f.value ?? "") ? "selected" : ""}>${esc(o.label)}</option>`)
      .join("")}</select>`;
  }
  if (f.type === "colors") {
    return `<label>${f.label}</label><div class="swatches">${COLORS.map(
      (c) => `<label class="swatch" style="background:${c}"><input type="radio" name="${f.name}" value="${c}" ${c === (f.value || COLORS[0]) ? "checked" : ""}></label>`
    ).join("")}</div>`;
  }
  return `<label for="m-${f.name}">${f.label}</label><input ${common} type="${f.type || "text"}" value="${esc(f.value ?? "")}" placeholder="${esc(f.placeholder || "")}" ${f.min ? `min="${f.min}"` : ""}>`;
}

function openModal({ title, fields, submit = "Salvar", onSubmit }) {
  $("#modal-title").textContent = title;
  $("#modal-body").innerHTML = fields.map(field).join("");
  $("#modal-submit").textContent = submit;
  $("#modal-erro").classList.add("hidden");
  modalSubmit = onSubmit;
  $("#modal").classList.remove("hidden");
  $("#modal-body input, #modal-body select")?.focus();
}

function closeModal() {
  $("#modal").classList.add("hidden");
  modalSubmit = null;
}

async function submitModal(e) {
  e.preventDefault();
  const values = Object.fromEntries(new FormData($("#modal-form")).entries());
  try {
    await modalSubmit(values);
    closeModal();
    await refresh();
  } catch (err) {
    $("#modal-erro").textContent = err.message;
    $("#modal-erro").classList.remove("hidden");
  }
}

const typeOptions = Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }));
const disciplinaOptions = (blank) => [
  { value: "", label: blank },
  ...state.disciplinas.map((d) => ({ value: d.id, label: d.nome })),
];

function taskForm(task) {
  openModal({
    title: task ? "Editar tarefa" : "Nova tarefa",
    fields: [
      { name: "titulo", label: "Título", required: true, value: task?.titulo, placeholder: "Ex.: Entregar relatório de Redes" },
      { name: "tipo", label: "Tipo", type: "select", options: typeOptions, value: task?.tipo || "tarefa" },
      { name: "disciplina_id", label: "Disciplina", type: "select", options: disciplinaOptions("Sem disciplina"), value: task?.disciplina_id },
      { name: "data_limite", label: "Data de entrega", type: "date", required: true, value: task?.data_limite },
    ],
    submit: task ? "Salvar alterações" : "Salvar tarefa",
    onSubmit: async (v) => {
      await api(task ? "PUT" : "POST", task ? `/tarefas/${task.id}` : "/tarefas", { ...v, disciplina_id: v.disciplina_id || null });
      toast(task ? "Tarefa atualizada." : "Tarefa criada.");
    },
  });
}

function disciplinaForm(d) {
  openModal({
    title: d ? "Editar disciplina" : "Nova disciplina",
    fields: [
      { name: "nome", label: "Nome", required: true, value: d?.nome, placeholder: "Ex.: Banco de Dados II" },
      { name: "professor", label: "Professor(a)", value: d?.professor },
      { name: "periodo", label: "Período", value: d?.periodo, placeholder: "Ex.: 2026/2" },
      { name: "cor", label: "Cor", type: "colors", value: d?.cor },
    ],
    onSubmit: async (v) => {
      await api(d ? "PUT" : "POST", d ? `/disciplinas/${d.id}` : "/disciplinas", v);
      toast(d ? "Disciplina atualizada." : "Disciplina criada.");
    },
  });
}

function metaForm() {
  openModal({
    title: "Nova meta",
    fields: [
      { name: "titulo", label: "Meta", required: true, placeholder: "Ex.: Fechar as listas de Estrutura de Dados" },
      { name: "alvo", label: "Quantas tarefas concluir", type: "number", required: true, value: 3, min: 1 },
      { name: "disciplina_id", label: "Disciplina", type: "select", options: disciplinaOptions("Todas as disciplinas") },
      { name: "prazo", label: "Até quando", type: "date", required: true },
    ],
    submit: "Criar meta",
    onSubmit: async (v) => {
      await api("POST", "/metas", { ...v, alvo: Number(v.alvo), disciplina_id: v.disciplina_id || null });
      toast("Meta criada.");
    },
  });
}

function turmaForm() {
  openModal({
    title: "Criar turma",
    fields: [{ name: "nome", label: "Nome da turma", required: true, placeholder: "Ex.: ADS 5º período — noturno" }],
    submit: "Criar turma",
    onSubmit: async (v) => {
      const t = await api("POST", "/turmas", v);
      toast(`Turma criada. Código: ${t.codigo}`);
    },
  });
}

function joinForm() {
  openModal({
    title: "Entrar em uma turma",
    fields: [{ name: "codigo", label: "Código recebido do representante", required: true, placeholder: "Ex.: K7M2QX" }],
    submit: "Entrar",
    onSubmit: async (v) => {
      const r = await api("POST", "/turmas/entrar", v);
      toast(`Você entrou em ${r.nome} e recebeu ${r.atividades_recebidas} atividade(s).`);
    },
  });
}

function atividadeForm(turmaId, a) {
  openModal({
    title: a ? "Editar atividade da turma" : "Publicar atividade para a turma",
    fields: [
      { name: "titulo", label: "Título", required: true, value: a?.titulo, placeholder: "Ex.: Prova de Redes — unidade 2" },
      { name: "tipo", label: "Tipo", type: "select", options: typeOptions, value: a?.tipo || "prova" },
      { name: "data_limite", label: "Data", type: "date", required: true, value: a?.data_limite },
    ],
    submit: a ? "Salvar" : "Publicar",
    onSubmit: async (v) => {
      const path = a ? `/turmas/${turmaId}/atividades/${a.id}` : `/turmas/${turmaId}/atividades`;
      const r = await api(a ? "PUT" : "POST", path, v);
      toast(a ? "Atividade atualizada para todos." : `Atividade enviada para ${r.enviadas} aluno(s).`);
    },
  });
}

// ---------- actions ----------
async function onAction(el) {
  const id = Number(el.dataset.id);
  const turmaId = Number(el.dataset.turma);
  const task = state.tarefas.find((t) => t.id === id);
  try {
    switch (el.dataset.action) {
      case "toggle-task":
        await api("PUT", `/tarefas/${id}`, { concluida: !task.concluida });
        break;
      case "edit-task":
        return taskForm(task);
      case "delete-task":
        if (!confirm(`Excluir a tarefa "${task.titulo}"?`)) return;
        await api("DELETE", `/tarefas/${id}`);
        toast("Tarefa excluída.");
        break;
      case "edit-disc":
        return disciplinaForm(state.disciplinas.find((d) => d.id === id));
      case "delete-disc":
        if (!confirm("Excluir a disciplina? As tarefas dela ficam sem disciplina.")) return;
        await api("DELETE", `/disciplinas/${id}`);
        toast("Disciplina excluída.");
        break;
      case "delete-meta":
        await api("DELETE", `/metas/${id}`);
        toast("Meta excluída.");
        break;
      case "new-atv":
        return atividadeForm(turmaId);
      case "edit-atv": {
        const list = await api("GET", `/turmas/${turmaId}/atividades`);
        return atividadeForm(turmaId, list.find((a) => a.id === id));
      }
      case "delete-atv":
        if (!confirm("Excluir a atividade para toda a turma?")) return;
        await api("DELETE", `/turmas/${turmaId}/atividades/${id}`);
        toast("Atividade removida da turma.");
        break;
      case "leave-turma":
        if (!confirm("Sair da turma? As atividades pendentes dela saem da sua lista.")) return;
        await api("DELETE", `/turmas/${turmaId}/sair`);
        toast("Você saiu da turma.");
        break;
      default:
        return;
    }
    await refresh();
  } catch (err) {
    toast(err.message);
  }
}

// ---------- wiring ----------
$("#auth-form").addEventListener("submit", submitAuth);
$("#auth-switch").addEventListener("click", (e) => {
  e.preventDefault();
  setAuthMode(!signupMode);
});
$("#logout").addEventListener("click", logout);
$("#nav").addEventListener("click", (e) => {
  const item = e.target.closest(".nav-item");
  if (item) go(item.dataset.view);
});
document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-go]");
  if (link) {
    e.preventDefault();
    go(link.dataset.go);
    return;
  }
  const el = e.target.closest("[data-action]");
  if (el) onAction(el);
});
$("#filtros").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  state.filtro = chip.dataset.filtro;
  document.querySelectorAll("#filtros .chip").forEach((c) => c.classList.toggle("active", c === chip));
  renderTarefas();
});
$("#primary-action").addEventListener("click", () => VIEWS[state.view].onAction());
$("#entrar-turma").addEventListener("click", joinForm);
$("#modal-form").addEventListener("submit", submitModal);
$("#modal-cancel").addEventListener("click", closeModal);
$("#modal-form").addEventListener("input", () => $("#modal-erro").classList.add("hidden"));

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

if (state.token) enterApp().catch(logout);
else logout();
