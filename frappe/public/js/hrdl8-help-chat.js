(function() {
  const API = "https://5nb6c272c4.execute-api.us-east-1.amazonaws.com/chat";
  let sessionId = null, isDragging = false, dragOff = {x:0,y:0};

  // Inject CSS
  const style = document.createElement("style");
  style.textContent = `
    #hrdl8-help-btn{position:fixed;bottom:24px;right:24px;z-index:10000;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#003D6B,#0066B3);color:#FFF8DC;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:22px;transition:transform .2s}
    #hrdl8-help-btn:hover{transform:scale(1.1)}
    #hrdl8-chat{position:fixed;bottom:86px;right:24px;z-index:10001;width:380px;height:520px;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.2);display:none;flex-direction:column;overflow:hidden;border:2px solid #0066B3;resize:both}
    #hrdl8-chat.open{display:flex}
    #hrdl8-chat-header{background:linear-gradient(135deg,#003D6B,#0066B3);color:#FFF8DC;padding:12px 16px;cursor:move;display:flex;align-items:center;user-select:none;flex-shrink:0}
    #hrdl8-chat-header span{font-weight:600;font-size:15px;flex:1}
    #hrdl8-chat-close{background:none;border:none;color:#FFF8DC;font-size:20px;cursor:pointer;padding:0 4px}
    #hrdl8-chat-body{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:#F8F6F0}
    .hrdl8-msg{max-width:88%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;word-wrap:break-word;white-space:pre-wrap}
    .hrdl8-msg.user{align-self:flex-end;background:#0066B3;color:#fff;border-bottom-right-radius:4px}
    .hrdl8-msg.bot{align-self:flex-start;background:#fff;color:#333;border:1px solid #E8E4DA;border-bottom-left-radius:4px}
    .hrdl8-msg.bot a{color:#0066B3}
    #hrdl8-chat-input{display:flex;padding:10px;border-top:1px solid #E8E4DA;background:#fff;flex-shrink:0}
    #hrdl8-chat-input input{flex:1;border:1px solid #ccc;border-radius:8px;padding:8px 12px;font-size:13px;outline:none}
    #hrdl8-chat-input input:focus{border-color:#0066B3}
    #hrdl8-chat-input button{margin-left:8px;background:#F5C518;color:#003D6B;border:none;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer;font-size:13px}
    #hrdl8-chat-input button:disabled{opacity:.5;cursor:not-allowed}
    .hrdl8-typing{align-self:flex-start;color:#999;font-size:12px;padding:4px 0}
  `;
  document.head.appendChild(style);

  // Help button
  const btn = document.createElement("button");
  btn.id = "hrdl8-help-btn";
  btn.innerHTML = "?";
  btn.title = "HRDL8 Help";
  document.body.appendChild(btn);

  // Chat window
  const chat = document.createElement("div");
  chat.id = "hrdl8-chat";
  chat.innerHTML = `
    <div id="hrdl8-chat-header"><span>💬 HRDL8 Help</span><button id="hrdl8-chat-close">✕</button></div>
    <div id="hrdl8-chat-body"><div class="hrdl8-msg bot">Hi! I'm the HRDL8 Help Assistant. Ask me anything about using the app — like "How do I apply for leave?" or "How do I run payroll?"</div></div>
    <div id="hrdl8-chat-input"><input type="text" placeholder="Ask a question..." /><button>Send</button></div>
  `;
  document.body.appendChild(chat);

  const body = chat.querySelector("#hrdl8-chat-body");
  const input = chat.querySelector("#hrdl8-chat-input input");
  const sendBtn = chat.querySelector("#hrdl8-chat-input button");
  const header = chat.querySelector("#hrdl8-chat-header");

  // Toggle
  btn.onclick = () => { chat.classList.toggle("open"); if(chat.classList.contains("open")) input.focus(); };
  chat.querySelector("#hrdl8-chat-close").onclick = () => chat.classList.remove("open");

  // Drag
  header.onmousedown = (e) => {
    if(e.target.id === "hrdl8-chat-close") return;
    isDragging = true;
    const r = chat.getBoundingClientRect();
    dragOff = {x: e.clientX - r.left, y: e.clientY - r.top};
    document.body.style.userSelect = "none";
  };
  document.onmousemove = (e) => {
    if(!isDragging) return;
    chat.style.left = (e.clientX - dragOff.x) + "px";
    chat.style.top = (e.clientY - dragOff.y) + "px";
    chat.style.right = "auto";
    chat.style.bottom = "auto";
  };
  document.onmouseup = () => { isDragging = false; document.body.style.userSelect = ""; };

  // Send
  async function send() {
    const q = input.value.trim();
    if(!q) return;
    addMsg(q, "user");
    input.value = "";
    sendBtn.disabled = true;
    const typing = document.createElement("div");
    typing.className = "hrdl8-typing";
    typing.textContent = "Thinking...";
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;
    try {
      const res = await fetch(API, {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({query:q, session_id:sessionId})});
      const data = await res.json();
      typing.remove();
      if(data.answer) {
        sessionId = data.session_id;
        addMsg(linkify(data.answer), "bot", true);
      } else {
        addMsg("Sorry, something went wrong. Please try again.", "bot");
      }
    } catch(e) {
      typing.remove();
      addMsg("Connection error. Please try again.", "bot");
    }
    sendBtn.disabled = false;
    input.focus();
  }

  sendBtn.onclick = send;
  input.onkeydown = (e) => { if(e.key === "Enter") send(); };

  function addMsg(text, type, isHtml) {
    const d = document.createElement("div");
    d.className = "hrdl8-msg " + type;
    if(isHtml) d.innerHTML = text; else d.textContent = text;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
  }

  function linkify(text) {
    return text.replace(/`(\/app\/[a-z0-9-]+)`/g, '<a href="$1" target="_blank">$1</a>')
               .replace(/(\/app\/[a-z0-9-]+)/g, '<a href="$1" target="_blank">$1</a>');
  }
})();
