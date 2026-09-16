(function () {
  "use strict";

  // Só monta o widget se o servidor confirmar que está configurado — em
  // produção, enquanto ainda não estiver bem ajustado, o botão nem aparece.
  fetch("/api/site-chat/status")
    .then(function (res) { return res.json(); })
    .then(function (data) { if (data && data.enabled) init(); })
    .catch(function () {});

  function init() {
  var HISTORY_LIMIT = 12;
  var history = [];
  var sending = false;
  // Só pra agrupar as mensagens da mesma conversa no log — não identifica a
  // pessoa, dura só enquanto a aba estiver aberta (some ao recarregar a página).
  var sessionId = (window.crypto && window.crypto.randomUUID)
    ? window.crypto.randomUUID()
    : "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);

  var style = document.createElement("style");
  style.textContent = [
    "#scweb-chat-btn{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;background:#6b21a8;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(107,33,168,.35);z-index:9999;display:flex;align-items:center;justify-content:center;transition:transform .15s;}",
    "#scweb-chat-btn:hover{transform:scale(1.06);}",
    "#scweb-chat-btn svg{width:26px;height:26px;}",
    "#scweb-chat-panel{position:fixed;right:20px;bottom:88px;width:340px;max-width:calc(100vw - 40px);height:460px;max-height:calc(100vh - 140px);background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.18);z-index:9999;display:none;flex-direction:column;overflow:hidden;font-family:'Plus Jakarta Sans',system-ui,sans-serif;}",
    "#scweb-chat-panel.open{display:flex;}",
    "#scweb-chat-head{background:#6b21a8;color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex:none;}",
    "#scweb-chat-head strong{font-size:.92rem;}",
    "#scweb-chat-head span{display:block;font-size:.72rem;opacity:.85;margin-top:1px;}",
    "#scweb-chat-close{background:none;border:none;color:#fff;cursor:pointer;font-size:1.1rem;line-height:1;padding:4px;opacity:.85;}",
    "#scweb-chat-close:hover{opacity:1;}",
    "#scweb-chat-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#faf9fc;}",
    ".scweb-msg{max-width:82%;padding:9px 12px;border-radius:12px;font-size:.85rem;line-height:1.5;white-space:pre-wrap;}",
    ".scweb-msg.user{align-self:flex-end;background:#6b21a8;color:#fff;border-bottom-right-radius:3px;}",
    ".scweb-msg.bot{align-self:flex-start;background:#ede9fe;color:#2a1245;border-bottom-left-radius:3px;}",
    ".scweb-msg.err{align-self:flex-start;background:#fde8e8;color:#8a1c1c;}",
    ".scweb-typing{align-self:flex-start;display:flex;gap:3px;padding:10px 12px;}",
    ".scweb-typing span{width:6px;height:6px;border-radius:50%;background:#a855f7;opacity:.5;animation:scweb-blink 1.1s infinite;}",
    ".scweb-typing span:nth-child(2){animation-delay:.2s;}",
    ".scweb-typing span:nth-child(3){animation-delay:.4s;}",
    "@keyframes scweb-blink{0%,80%,100%{opacity:.3;}40%{opacity:1;}}",
    "#scweb-chat-form{display:flex;gap:8px;padding:10px;border-top:1px solid #eee;flex:none;background:#fff;}",
    "#scweb-chat-input{flex:1;border:1px solid #ddd;border-radius:10px;padding:9px 11px;font-size:.85rem;font-family:inherit;resize:none;outline:none;}",
    "#scweb-chat-input:focus{border-color:#a855f7;}",
    "#scweb-chat-send{background:#6b21a8;color:#fff;border:none;border-radius:10px;width:38px;flex:none;cursor:pointer;display:flex;align-items:center;justify-content:center;}",
    "#scweb-chat-send:disabled{opacity:.5;cursor:default;}",
    ".scweb-msg-img{align-self:flex-start;max-width:82%;height:auto;display:block;border-radius:10px;border:1px solid #e5d9f7;box-shadow:0 2px 8px rgba(0,0,0,.08);cursor:zoom-in;}",
    ".scweb-quicklist{align-self:flex-start;max-width:100%;display:flex;flex-wrap:wrap;gap:6px;}",
    ".scweb-chip{background:#fff;border:1px solid #ddd2f2;color:#6b21a8;font-size:.78rem;padding:6px 10px;border-radius:999px;cursor:pointer;transition:background .15s,border-color .15s;}",
    ".scweb-chip:hover{background:#f5f0ff;border-color:#a855f7;}",
    ".scweb-nudge{position:fixed;right:20px;bottom:88px;max-width:210px;background:#fff;color:#2a1245;padding:10px 12px 10px 14px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.16);font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:.85rem;line-height:1.35;z-index:9998;display:flex;align-items:center;gap:6px;cursor:pointer;opacity:0;transform:translateY(8px);transition:opacity .3s ease,transform .3s ease;pointer-events:none;}",
    ".scweb-nudge.show{opacity:1;transform:translateY(0);pointer-events:auto;}",
    ".scweb-nudge::after{content:'';position:absolute;right:22px;bottom:-6px;width:12px;height:12px;background:#fff;transform:rotate(45deg);box-shadow:2px 2px 3px rgba(0,0,0,.04);}",
    ".scweb-nudge-close{background:none;border:none;color:#bbb;cursor:pointer;font-size:.85rem;line-height:1;padding:2px;flex:none;}",
    ".scweb-nudge-close:hover{color:#888;}",
    "@media(prefers-reduced-motion:reduce){.scweb-typing span{animation:none;}.scweb-nudge{transition:none;}}"
  ].join("");
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.id = "scweb-chat-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", "Abrir assistente SCWeb");
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

  var panel = document.createElement("div");
  panel.id = "scweb-chat-panel";
  panel.innerHTML =
    '<div id="scweb-chat-head"><div><strong>Assistente SCWeb</strong><span>Dúvidas sobre o sistema</span></div><button id="scweb-chat-close" type="button" aria-label="Fechar">✕</button></div>' +
    '<div id="scweb-chat-body"></div>' +
    '<form id="scweb-chat-form"><textarea id="scweb-chat-input" rows="1" placeholder="Digite sua pergunta..." maxlength="1000"></textarea><button id="scweb-chat-send" type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg></button></form>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var body = panel.querySelector("#scweb-chat-body");
  var form = panel.querySelector("#scweb-chat-form");
  var input = panel.querySelector("#scweb-chat-input");
  var sendBtn = panel.querySelector("#scweb-chat-send");
  var closeBtn = panel.querySelector("#scweb-chat-close");
  var opened = false;

  function addMsg(text, cls) {
    var el = document.createElement("div");
    el.className = "scweb-msg " + cls;
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  // Imagens vêm sempre de /api/site-chat/img/:slug (URL montada por nós, nunca
  // pelo texto do modelo) — só o src é dado externo aqui, sem innerHTML.
  function addImg(url, alt) {
    var img = document.createElement("img");
    img.className = "scweb-msg-img";
    img.src = url;
    img.alt = alt || "Tela do SCWeb";
    img.addEventListener("click", function () { window.open(url, "_blank"); });
    body.appendChild(img);
    body.scrollTop = body.scrollHeight;
    return img;
  }

  function showTyping() {
    var el = document.createElement("div");
    el.className = "scweb-typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  // Lista de recursos pra escolher de cara, como o índice no início do Guia
  // Rápido — dá pra ver mais funções do SCWeb sem precisar pensar o que
  // perguntar primeiro.
  var TOPICOS = [
    "Prontuário eletrônico",
    "Agenda e confirmação automática",
    "Teleconsulta nativa",
    "Cartão de Pré-Natal Digital",
    "Importação automática de exames",
    "Receita com assinatura digital",
    "DMG Control (glicemia gestacional)",
    "Relatórios personalizados"
  ];

  function addQuickList() {
    var wrap = document.createElement("div");
    wrap.className = "scweb-quicklist";
    TOPICOS.forEach(function (topico) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "scweb-chip";
      chip.textContent = topico;
      chip.addEventListener("click", function () { sendMessage("Me fala sobre " + topico); });
      wrap.appendChild(chip);
    });
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  function openPanel() {
    dismissNudge();
    panel.classList.add("open");
    if (!opened) {
      opened = true;
      addMsg("Oi! Posso te ajudar com dúvidas sobre recursos, configurações, planos e valores, e como o SCWeb funciona no dia a dia. O que você quer saber? Alguns exemplos:", "bot");
      addQuickList();
    }
    input.focus();
  }

  // Balãozinho que convida a clicar, mostrado uma vez por sessão de navegação
  // (sessionStorage — some ao fechar a aba) alguns segundos depois de carregar
  // a página. Não aparece de novo se já foi visto ou dispensado.
  var NUDGE_KEY = "scweb-chat-nudge-seen";
  var nudge = null;
  var nudgeShowTimer = null;
  var nudgeHideTimer = null;

  function dismissNudge() {
    clearTimeout(nudgeShowTimer);
    clearTimeout(nudgeHideTimer);
    if (nudge) nudge.classList.remove("show");
    try { sessionStorage.setItem(NUDGE_KEY, "1"); } catch (e) {}
  }

  function setupNudge() {
    try { if (sessionStorage.getItem(NUDGE_KEY)) return; } catch (e) {}
    nudge = document.createElement("div");
    nudge.className = "scweb-nudge";
    nudge.innerHTML = '<span>Tire suas dúvidas 💬</span><button type="button" class="scweb-nudge-close" aria-label="Fechar">✕</button>';
    document.body.appendChild(nudge);
    nudge.querySelector(".scweb-nudge-close").addEventListener("click", function (e) {
      e.stopPropagation();
      dismissNudge();
    });
    nudge.addEventListener("click", openPanel);
    nudgeShowTimer = setTimeout(function () {
      nudge.classList.add("show");
      nudgeHideTimer = setTimeout(dismissNudge, 8000);
    }, 3000);
  }
  setupNudge();

  btn.addEventListener("click", function () {
    if (panel.classList.contains("open")) {
      panel.classList.remove("open");
    } else {
      openPanel();
    }
  });
  closeBtn.addEventListener("click", function () {
    panel.classList.remove("open");
  });

  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 90) + "px";
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  function sendMessage(text) {
    text = (text || "").trim();
    if (!text || sending) return;
    addMsg(text, "user");
    history.push({ role: "user", content: text });
    history = history.slice(-HISTORY_LIMIT);
    sending = true;
    sendBtn.disabled = true;
    var typing = showTyping();

    fetch("/api/site-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history.slice(0, -1), sessionId: sessionId })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Erro ao responder.");
          return data;
        });
      })
      .then(function (data) {
        typing.remove();
        if (data.reply && data.reply.trim()) addMsg(data.reply, "bot");
        if (Array.isArray(data.imagens)) {
          data.imagens.forEach(function (img) { addImg(img.url, img.label); });
        }
        history.push({ role: "assistant", content: data.reply });
        history = history.slice(-HISTORY_LIMIT);
      })
      .catch(function (err) {
        typing.remove();
        addMsg(err.message || "Não consegui responder agora. Tente novamente em instantes.", "err");
      })
      .finally(function () {
        sending = false;
        sendBtn.disabled = false;
        input.focus();
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    input.style.height = "auto";
    sendMessage(text);
  });
  }
})();
