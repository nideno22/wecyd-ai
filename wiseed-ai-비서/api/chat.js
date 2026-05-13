<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>위시드 AI 비서</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f8f8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 2rem; }
  .container { max-width: 600px; width: 100%; }
  .header { text-align: center; margin-bottom: 2rem; }
  .kirby { font-size: 72px; margin-bottom: 0.5rem; }
  h1 { font-size: 24px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
  .subtitle { font-size: 14px; color: #888; }
  .card { background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .card h2 { font-size: 13px; font-weight: 600; color: #888; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  label { font-size: 12px; color: #666; display: block; margin-bottom: 4px; margin-top: 10px; }
  label:first-of-type { margin-top: 0; }
  input[type="text"], input[type="password"] { width: 100%; padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px; outline: none; transition: border 0.2s; }
  input:focus { border-color: #ff6eb4; }
  .ask-row { display: flex; gap: 8px; }
  .ask-row input { flex: 1; }
  button { background: #ff6eb4; color: white; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
  button:hover { background: #ff4da0; }
  button:disabled { background: #ccc; cursor: not-allowed; }
  .chat-history { display: flex; flex-direction: column; gap: 12px; margin-bottom: 1rem; }
  .chat-bubble { background: white; border-radius: 16px; padding: 1.25rem; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .chat-bubble.user { background: #fff0f7; border-left: 3px solid #ff6eb4; }
  .bubble-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .bubble-icon { font-size: 20px; }
  .bubble-name { font-size: 13px; font-weight: 600; color: #ff6eb4; }
  .bubble-name.user-name { color: #888; }
  .bubble-text { font-size: 15px; line-height: 1.7; color: #1a1a1a; white-space: pre-wrap; }
  .error { display: none; background: #fff0f0; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; color: #d00; font-size: 13px; }
  .clear-btn { background: none; color: #aaa; border: 1px solid #e0e0e0; font-size: 12px; padding: 6px 12px; border-radius: 8px; cursor: pointer; margin-bottom: 1rem; display: none; }
  .clear-btn:hover { color: #ff6eb4; border-color: #ff6eb4; background: none; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="kirby">🌸</div>
    <h1>위시드 AI 비서</h1>
    <p class="subtitle">포요~ 안녕하세요! 노션에서 뭐든 찾아드릴게요.</p>
  </div>

  <div class="card">
    <h2>설정</h2>
    <label>노션 API 토큰</label>
    <input type="password" id="notion-token" placeholder="secret_..." />
    <label>노션 페이지 ID</label>
    <input type="text" id="page-id" placeholder="페이지 ID 입력" />
    <label>내 이름</label>
    <input type="text" id="user-name" placeholder="레사" />
  </div>

  <div class="error" id="error-box"></div>
  <div class="chat-history" id="chat-history"></div>
  <button class="clear-btn" id="clear-btn" onclick="clearChat()">대화 초기화</button>

  <div class="card">
    <h2>질문하기</h2>
    <div class="ask-row">
      <input type="text" id="question" placeholder="노션에서 뭐든 물어보세요..." />
      <button id="ask-btn" onclick="askQuestion()">물어보기</button>
    </div>
  </div>
</div>

<script>
let chatHistory = [];

function getUserName() {
  return document.getElementById('user-name').value.trim() || '매니저';
}

function addBubble(role, text) {
  const history = document.getElementById('chat-history');
  const name = getUserName();
  const isUser = role === 'user';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ' + role;
  bubble.innerHTML = '<div class="bubble-header"><span class="bubble-icon">' + (isUser ? '💬' : '🌸') + '</span><span class="bubble-name ' + (isUser ? 'user-name' : '') + '">' + (isUser ? name + '님' : name + '님의 AI 비서 포요~') + '</span></div><p class="bubble-text">' + text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') + '</p>';
  history.appendChild(bubble);
  bubble.scrollIntoView({ behavior: 'smooth' });
  document.getElementById('clear-btn').style.display = 'block';
}

function clearChat() {
  chatHistory = [];
  document.getElementById('chat-history').innerHTML = '';
  document.getElementById('clear-btn').style.display = 'none';
}

async function askQuestion() {
  const token = document.getElementById('notion-token').value.trim();
  const pageId = document.getElementById('page-id').value.trim();
  const question = document.getElementById('question').value.trim();
  const btn = document.getElementById('ask-btn');
  const errorBox = document.getElementById('error-box');

  errorBox.style.display = 'none';

  if (!token) { showError('노션 API 토큰을 입력해주세요!'); return; }
  if (!pageId) { showError('페이지 ID를 입력해주세요!'); return; }
  if (!question) { showError('질문을 입력해주세요!'); return; }

  addBubble('user', question);
  document.getElementById('question').value = '';
  btn.textContent = '찾는 중...';
  btn.disabled = true;
  chatHistory.push({ role: 'user', content: question });

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notionToken: token, pageId, question, userName: getUserName(), history: chatHistory.slice(-10) })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    chatHistory.push({ role: 'assistant', content: data.answer });
    addBubble('assistant', data.answer);
  } catch (err) {
    showError('오류: ' + err.message);
    chatHistory.pop();
  } finally {
    btn.textContent = '물어보기';
    btn.disabled = false;
  }
}

function showError(msg) {
  const errorBox = document.getElementById('error-box');
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}

document.getElementById('question').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') askQuestion();
});
</script>
</body>
</html>
