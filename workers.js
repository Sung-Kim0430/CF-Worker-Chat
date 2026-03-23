export default {
    async fetch(request, env) {
        try {
            const url = new URL(request.url);
            if (url.pathname.startsWith('/api')) {
                // 将 env 传递给 handleAPI
                return handleAPI(request, env);
            }

            // --- 将 MAX_TOKENS 注入到 HTML 模板 ---
            // 提供一个默认值，以防环境变量未设置
            const maxTokensValue = env.MAX_TOKENS || 2048;
            // 使用简单的替换将值注入，确保只替换一次
            const renderedHtml = htmlTemplate.replace('{{MAX_TOKENS_PLACEHOLDER}}', maxTokensValue.toString())
                                           .replace('{{MAX_TOKENS_PLACEHOLDER}}', maxTokensValue.toString()); // Replace可能只替换第一个，多写一次确保JS和显示都替换

            // 返回包含响应式 CSS 和注入值的 HTML
            return new Response(renderedHtml, {
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-store' // 开发时禁用缓存，部署时可考虑调整
                }
            });
        } catch (err) {
            console.error("Fetch handler error:", err.stack);
            return new Response(`服务器内部错误: ${err.message}`, { status: 500 });
        }
    }
};

// --- SSE Stream Parser ---
// (保持不变)
function createSseChunkParser() {
    let buffer = '';
    const decoder = new TextDecoder();
    return new TransformStream({
        transform(chunkUint8, controller) {
            buffer += decoder.decode(chunkUint8, { stream: true });
            let boundaryIndex;
            while ((boundaryIndex = buffer.indexOf('\n\n')) !== -1) {
                const message = buffer.slice(0, boundaryIndex);
                buffer = buffer.slice(boundaryIndex + 2);
                if (message.startsWith('data: ')) {
                    const jsonData = message.substring(6).trim();
                    if (jsonData === '[DONE]') {
                        controller.terminate();
                        return;
                    }
                    try {
                        const parsed = JSON.parse(jsonData);
                        if (parsed.response) {
                            controller.enqueue(parsed.response);
                        } else if (parsed.error) {
                            console.error("AI Stream Error:", parsed.error);
                            controller.enqueue(`\n[错误: ${parsed.error.message || JSON.stringify(parsed.error)}]\n`);
                            controller.terminate();
                        }
                    } catch (e) {
                        console.error('SSE JSON Parse Error:', e, 'Data:', jsonData);
                    }
                }
            }
        },
        flush(controller) {
            // (原有 flush 逻辑保持不变)
            if (buffer.startsWith('data: ')) {
                const jsonData = buffer.substring(6).trim();
                if (jsonData === '[DONE]') {
                    controller.terminate();
                    return;
                }
                try {
                    const parsed = JSON.parse(jsonData);
                    if (parsed.response) {
                        controller.enqueue(parsed.response);
                    } else if (parsed.error) {
                        console.error("AI Stream Error (flush):", parsed.error);
                        controller.enqueue(`\n[错误: ${parsed.error.message || JSON.stringify(parsed.error)}]\n`);
                    }
                } catch (e) {
                    console.error('SSE JSON Parse Error (flush):', e, 'Data:', jsonData);
                }
            } else if (buffer.trim()) {
                console.warn("SSE Parser: Unprocessed trailing data in buffer:", buffer);
            }
             try { controller.terminate(); } catch(e) {}
        }
    });
}


// --- API Handler ---
async function handleAPI(request, env) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-expose-headers': '*'
    };
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    const { pathname } = new URL(request.url);
    if (pathname === '/api/chat' && request.method === 'POST') {
        try {
            if (!env.API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
                 console.error("Missing API_TOKEN or CLOUDFLARE_ACCOUNT_ID in environment variables.");
                 return new Response(JSON.stringify({ error: '服务器配置不完整' }), {
                    status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                 });
            }
            const requestData = await request.json();
            // --- 修改：增加对 desired_max_tokens 的校验 ---
            if (!requestData || typeof requestData.message !== 'string' || !Array.isArray(requestData.history) || (requestData.desired_max_tokens !== undefined && typeof requestData.desired_max_tokens !== 'number')) {
                 return new Response(JSON.stringify({ error: '无效的请求数据格式' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                 });
            }

            // --- History Truncation (保持不变) ---
            const MAX_HISTORY_MESSAGES = 10;
            let truncatedHistory = requestData.history;
            if (truncatedHistory.length > MAX_HISTORY_MESSAGES) {
                truncatedHistory = truncatedHistory.slice(-MAX_HISTORY_MESSAGES);
                console.log(`History truncated to last ${MAX_HISTORY_MESSAGES} messages.`);
            }

            const messagesToSend = [
                { role: "system", content: "You are a friendly assistant. Format responses using Markdown." },
                ...truncatedHistory.map(({ role, content }) => ({ role, content })),
                { role: "user", content: requestData.message }
            ];

            // --- 修改：决定用于 AI API 的 max_tokens ---
            // 优先使用前端计算并传递过来的值，否则使用环境变量的值（或默认值）
            const maxTokensForApi = requestData.desired_max_tokens !== undefined
                ? Math.max(10, Math.floor(requestData.desired_max_tokens)) // 确保至少为10，并取整
                : Number(env.MAX_TOKENS || 2048); // 从环境变量获取或使用默认值

            console.log(`Requesting AI with max_tokens: ${maxTokensForApi}`); // 调试日志

            const aiResponse = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${env.CLOUDFLARE_MODEL}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${env.API_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        messages: messagesToSend,
                        max_tokens: maxTokensForApi, // 使用上面决定的值
                        stream: true
                    })
                }
            );

            if (!aiResponse.ok) {
                const errorText = await aiResponse.text();
                console.error(`AI API Error (${aiResponse.status}): ${errorText}`);
                return new Response(JSON.stringify({
                    success: false,
                    error: `AI 服务调用失败 (${aiResponse.status}): ${errorText.substring(0, 200)}`
                }), {
                    status: aiResponse.status,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            if (!aiResponse.body) {
                console.error("AI API returned OK status but no response body.");
                 return new Response(JSON.stringify({ error: 'AI 服务未返回有效响应体' }), {
                    status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                 });
            }

            const sseParser = createSseChunkParser();
            const stream = aiResponse.body.pipeThrough(sseParser)
                                       .pipeThrough(new TextEncoderStream());
            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-store',
                    ...corsHeaders
                }
            });
        } catch (err) {
            console.error('Error in /api/chat (streaming):', err.stack);
            return new Response(JSON.stringify({
                success: false,
                error: `处理流式聊天请求时出错: ${err.message}`
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    return new Response('API 路径未找到', { status: 404, headers: corsHeaders });
}


// --- HTML 模板 (包含响应式 CSS 和修改后的 JS) ---
const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 智能助手</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js"></script>
  <style>
      /* --- Base Styles --- */
      html, body {
          height: 100%; margin: 0; padding: 0;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
          background-color: #f4f7f9; color: #333; line-height: 1.6;
      }
      *, *:before, *:after { box-sizing: inherit; }

      .chat-container {
          /* --- 修改：PC 端更宽 --- */
          max-width: 1000px; /* 增加最大宽度 */
          margin: 20px auto; /* 保持居中 */
          background-color: white; border-radius: 8px; padding: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          display: flex; flex-direction: column;
          /* --- 修改：调整高度计算 --- */
          height: calc(100vh - 40px); /* 视口高度减去上下 margin */
          max-height: 800px; /* 增加最大高度 */
          overflow: hidden;
      }

      h1 { text-align: center; color: #333; margin-top: 0; margin-bottom: 15px; font-size: 1.8em; }

      .chat-history {
          flex-grow: 1; overflow-y: auto; margin-bottom: 15px; padding: 10px 15px;
          border: 1px solid #e0e0e0; border-radius: 5px; background-color: #fdfdfd;
      }

      .message {
          margin: 10px 0; padding: 10px 15px; border-radius: 15px; max-width: 85%;
          word-wrap: break-word; position: relative; clear: both; line-height: 1.4;
      }
      .user-message {
          background-color: #007bff; color: white; margin-left: auto;
          border-bottom-right-radius: 5px; float: right;
      }
      .assistant-message {
          background-color: #e9ecef; color: #333; margin-right: auto;
          border-bottom-left-radius: 5px; float: left;
      }
      .chat-history::after { content: ""; display: table; clear: both; }

      /* Markdown styles */
      .assistant-message pre { background-color: #f0f0f0; padding: 10px; border-radius: 5px; overflow-x: auto; border: 1px solid #ddd; font-size: 0.9em; }
      .assistant-message code:not(pre code) { font-family: "Courier New", Courier, monospace; background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }
      .assistant-message pre code { background-color: transparent; padding: 0; border-radius: 0; font-size: inherit; border: none; }
      .assistant-message ul, .assistant-message ol { padding-left: 20px; margin-top: 0.5em; margin-bottom: 0.5em; }
      .assistant-message li { margin-bottom: 5px; }
      .assistant-message a { color: #0056b3; text-decoration: none; }
      .assistant-message a:hover { text-decoration: underline; }
      .assistant-message blockquote { border-left: 3px solid #ccc; padding-left: 10px; margin-left: 0; color: #555; font-style: italic; }
      .assistant-message h1, .assistant-message h2, .assistant-message h3 { margin-top: 1em; margin-bottom: 0.5em; font-weight: 600; line-height: 1.2; }
      .assistant-message h1 { font-size: 1.4em; }
      .assistant-message h2 { font-size: 1.2em; }
      .assistant-message h3 { font-size: 1.1em; }

      .input-container {
          display: flex; gap: 10px; margin-top: auto; padding-top: 15px;
          align-items: flex-end;
      }

      .input-wrapper {
          position: relative; flex: 1; display: flex; flex-direction: column;
      }

      .char-counter {
          font-size: 0.75em; color: #666; height: 18px; line-height: 18px;
          padding-left: 15px;
      }
      .char-counter.error { color: red; font-weight: bold; }

      #userInput {
          flex: 1; padding: 10px 15px; border: 1px solid #ccc; border-radius: 18px;
          font-size: 1em; outline: none; transition: border-color 0.2s ease, height 0.1s ease;
          resize: none; overflow-y: auto; line-height: 1.4; min-height: 40px;
          box-sizing: border-box; width: 100%;
      }
      #userInput:focus { border-color: #007bff; }

      button {
          padding: 10px 20px; background-color: #007bff; color: white; border: none;
          border-radius: 18px; cursor: pointer; font-size: 1em; font-weight: 500;
          transition: background-color 0.2s ease; white-space: nowrap; height: 40px;
          line-height: 1; align-self: flex-end;
      }
      button:hover:not(:disabled) { background-color: #0056b3; }
      button:disabled { background-color: #cccccc; cursor: not-allowed; }
      /* --- 修改：打字指示器样式调整 --- */
.typing-indicator-span {
  display: inline; /* 确保 span 本身是内联的 */
  /* 可以移除之前的 .typing-indicator::after 选择器，直接用这个 */
}
.typing-indicator-span::after {
  content: '▍';
  animation: blink 1s infinite;
  display: inline-block;  /* 移除或改为 inline */
  /* display: inline; */
  position: relative;
  vertical-align: baseline; /* 保持基线对齐 */
  margin-left: 1px; /* 微调间距 */
  font-size: 1em; /* 与周围文字大小一致 */
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* ... 其他 CSS 保持不变 ... */

      /* Responsive Styles */
      @media (max-width: 600px) {
          body { margin: 0; }
          .chat-container {
              width: 100%; height: 100vh; max-width: none; margin: 0; padding: 10px;
              border-radius: 0; box-shadow: none; max-height: none;
          }
          h1 { font-size: 1.5em; margin-bottom: 10px; }
          .chat-history { padding: 8px; margin-bottom: 10px; }
          .message { padding: 8px 12px; font-size: 0.95em; max-width: 90%; }
          .input-container { padding-top: 10px; gap: 8px; }
          #userInput { padding: 8px 12px; font-size: 1em; min-height: 38px; border-radius: 15px;}
          button { padding: 8px 15px; font-size: 1em; height: 38px; border-radius: 15px;}
          .char-counter { padding-left: 12px; font-size: 0.7em; }
          .assistant-message pre { font-size: 0.85em; }
          .assistant-message code:not(pre code) { font-size: 0.85em; }
      }
  </style>
</head>
<body>
  <div class="chat-container">
      <h1>AI 智能助手</h1>
      <div class="chat-history" id="chatHistory"></div>
      <div class="input-container">
          <div class="input-wrapper">
              <span id="charCounter" class="char-counter">0 / {{MAX_TOKENS_PLACEHOLDER}}</span>
              <textarea id="userInput" placeholder="输入你的消息 (Shift+Enter 换行)..." rows="1"></textarea>
          </div>
          <button id="sendButton">发送</button>
      </div>
  </div>

  <script>
      marked.setOptions({ gfm: true, breaks: true });
      let conversationHistory = [];
      const chatHistoryEl = document.getElementById('chatHistory');
      const userInputEl = document.getElementById('userInput');
      const sendButton = document.getElementById('sendButton');
      const charCounterEl = document.getElementById('charCounter');

      let MAX_TOKENS_FROM_SERVER = 2048; // 默认值
      try {
           const counterText = charCounterEl.textContent || '';
           const parts = counterText.split('/');
           if (parts.length === 2 && !isNaN(parseInt(parts[1].trim(), 10))) {
               MAX_TOKENS_FROM_SERVER = parseInt(parts[1].trim(), 10);
           } else {
               console.warn("无法从模板解析 MAX_TOKENS，将使用默认值:", MAX_TOKENS_FROM_SERVER);
           }
      } catch (e) {
          console.error("解析 MAX_TOKENS 时出错:", e);
      }
      const MAX_TOKENS = MAX_TOKENS_FROM_SERVER;

      // --- Helper 函数 ---
      function createMessageElement(role, initialContent = '') {
            const div = document.createElement('div');
            div.className = \`message \${role}-message\`;
            // --- 修改：初始创建时直接设置 innerHTML，以便后续追加打字指示器 ---
            if (role === 'assistant') {
                 div.innerHTML = initialContent; // 允许初始为空或包含 HTML
            } else {
                 div.textContent = initialContent; // 用户消息仍然是纯文本
            }
            chatHistoryEl.appendChild(div);
            scrollToBottom();
            return div;
      }

      // --- 修改：此函数现在只负责最终清理和确保最终渲染 ---
      function finalizeAssistantMessage(element, fullContent) {
            // 移除可能的打字指示器（如果还在的话，尽管实时渲染会覆盖它）
            const indicator = element.querySelector('.typing-indicator-span');
            if (indicator) indicator.remove();

            // 确保最后一次渲染是最完整的内容
            try {
                const rawHtml = marked.parse(fullContent);
                const cleanHtml = DOMPurify.sanitize(rawHtml);
                element.innerHTML = cleanHtml;
            } catch (e) {
                console.error("Markdown parsing/sanitizing error (final):", e);
                element.textContent = fullContent; // Fallback
            }
            scrollToBottom(); // 确保滚动到底部
      }

       function scrollToBottom() {
           // --- 优化：只有当用户接近底部时才自动滚动 ---
           const isScrolledToBottom = chatHistoryEl.scrollHeight - chatHistoryEl.clientHeight <= chatHistoryEl.scrollTop + 100; // 增加容差
           if (isScrolledToBottom) {
               // 使用 requestAnimationFrame 平滑滚动
               requestAnimationFrame(() => {
                   chatHistoryEl.scrollTo({ top: chatHistoryEl.scrollHeight, behavior: 'smooth' });
               });
           }
       }

       function adjustTextareaHeight() {
           userInputEl.style.height = 'auto';
           let newHeight = userInputEl.scrollHeight;
           const maxHeight = 150;
           if (newHeight > maxHeight) {
               newHeight = maxHeight;
               userInputEl.style.overflowY = 'auto';
           } else {
               userInputEl.style.overflowY = 'hidden';
           }
           userInputEl.style.height = newHeight + 'px';
       }

       function updateCharCountAndButton() {
            const currentLength = userInputEl.value.length;
            charCounterEl.textContent = \`\${currentLength} / \${MAX_TOKENS}\`;
            const isOverLimit = currentLength > MAX_TOKENS;
            const isEmpty = currentLength === 0;
            if (isOverLimit) {
                charCounterEl.classList.add('error');
            } else {
                charCounterEl.classList.remove('error');
            }
            sendButton.disabled = isOverLimit || isEmpty || userInputEl.disabled;
       }


      async function sendMessage() {
          const message = userInputEl.value.trim();
          if (!message) return;

          const currentLength = userInputEl.value.length;
          if (currentLength > MAX_TOKENS) {
              alert(\`输入内容过长，请删减至 \${MAX_TOKENS} 字符以内。\`);
              return;
          }

          sendButton.disabled = true;
          userInputEl.disabled = true;
          userInputEl.value = '';
          adjustTextareaHeight();
          updateCharCountAndButton();

          createMessageElement('user', message);
          conversationHistory.push({ role: "user", content: message });

          // --- 修改：初始创建 assistant 消息元素，内容为空 ---
          const assistantMsgElement = createMessageElement('assistant', '');
          let accumulatedResponse = "";

          // --- 新增：节流相关变量 ---
          let lastRenderTime = 0;
          const throttleDelay = 100; // ms - 渲染间隔
          let renderScheduled = false;

          // --- 新增：实时渲染函数 ---
          function renderAssistantMessage() {
              try {
                  // 移除旧的指示器（如果存在）
                  const existingIndicator = assistantMsgElement.querySelector('.typing-indicator-span');
                  if (existingIndicator) existingIndicator.remove();

                  // 解析并净化当前累积的内容
                  const rawHtml = marked.parse(accumulatedResponse);
                  const cleanHtml = DOMPurify.sanitize(rawHtml);

                  // 设置 HTML 并重新附加打字指示器
                  assistantMsgElement.innerHTML = cleanHtml + '<span class="typing-indicator-span typing-indicator"></span>';

                  scrollToBottom(); // 渲染后滚动
              } catch (e) {
                  console.error("实时 Markdown 渲染错误:", e);
                  // 发生错误时，回退到显示原始文本 + 错误提示
                  assistantMsgElement.textContent = accumulatedResponse + ' [渲染错误]';
              }
              renderScheduled = false; // 标记渲染完成
          }

          try {
              const desiredMaxTokens = Math.max(50, MAX_TOKENS - currentLength);
              const response = await fetch('/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      message: message,
                      history: conversationHistory.slice(0, -1),
                      desired_max_tokens: desiredMaxTokens
                  })
              });

              if (response.ok && response.body) {
                   const reader = response.body
                        .pipeThrough(new TextDecoderStream())
                        .getReader();

                   while (true) {
                        const { value, done } = await reader.read();
                        if (done) { console.log("Stream finished."); break; }

                        accumulatedResponse += value;

                        // --- 修改：使用节流调用渲染 ---
                        const now = Date.now();
                        if (!renderScheduled) {
                            if (now - lastRenderTime >= throttleDelay) {
                                // 达到节流时间，立即渲染
                                renderAssistantMessage();
                                lastRenderTime = now;
                            } else {
                                // 未达到时间，安排下一次动画帧渲染
                                renderScheduled = true;
                                requestAnimationFrame(() => {
                                     // 在动画帧回调中再次检查时间，确保不会过于频繁
                                     if (Date.now() - lastRenderTime >= throttleDelay) {
                                         renderAssistantMessage();
                                         lastRenderTime = Date.now();
                                     } else {
                                         // 如果时间仍未到，则重新安排 (确保最后一块能被渲染)
                                         renderScheduled = true; // 保持 scheduled 状态
                                         requestAnimationFrame(renderAssistantMessage); // 简单地再次请求
                                     }
                                });
                            }
                        }
                        // 注意：不再直接更新 textContent
                   }
                   // --- 修改：流结束后，调用 finalize ---
                   finalizeAssistantMessage(assistantMsgElement, accumulatedResponse);
                   conversationHistory.push({ role: "assistant", content: accumulatedResponse });

              } else { // (错误处理保持不变)
                  // --- 修改：移除打字指示器（如果 finalizeAssistantMessage 未运行） ---
                  const indicator = assistantMsgElement.querySelector('.typing-indicator-span');
                  if (indicator) indicator.remove();

                  let errorMsg = \`请求失败: \${response.status}\`;
                  try {
                      const errData = await response.json();
                      errorMsg += \`: \${errData.error || JSON.stringify(errData)}\`;
                  } catch (e) {
                      const textError = await response.text();
                      errorMsg += \`: \${textError.substring(0, 200)}\` + (textError.length > 200 ? '...' : '');
                       console.error("Non-JSON error response from server:", textError);
                  }
                  console.error("API Error:", errorMsg);
                  assistantMsgElement.textContent = \`抱歉，发生错误：\${errorMsg}\`;
                  assistantMsgElement.style.backgroundColor = '#f8d7da';
              }
          } catch (err) { // (错误处理保持不变)
              console.error('Fetch or Stream Reading Error:', err);
               // --- 修改：移除打字指示器 ---
               const indicator = assistantMsgElement.querySelector('.typing-indicator-span');
               if (indicator) indicator.remove();
               assistantMsgElement.textContent = '网络连接中断或读取数据流时出错，请重试。';
               assistantMsgElement.style.backgroundColor = '#f8d7da';
          } finally {
              userInputEl.disabled = false;
              updateCharCountAndButton();
              userInputEl.focus();
              // --- 修改：最终清理，确保指示器被移除（finalizeAssistantMessage 应该已处理，但双重保险） ---
              const indicator = assistantMsgElement.querySelector('.typing-indicator-span');
              if (indicator) indicator.remove();
              // 确保滚动到底部
              scrollToBottom();
          }
      }

      // --- Event Listeners ---
      sendButton.addEventListener('click', sendMessage);
      userInputEl.addEventListener('input', () => {
          adjustTextareaHeight();
          updateCharCountAndButton();
      });
      userInputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!sendButton.disabled) {
                 sendMessage();
              }
          }
      });

      // Initial Greeting
      createMessageElement('assistant', '<p>你好！我是AI助手，有什么能够帮到你？</p>'); // 初始消息也用 HTML

      // Page load init
      document.addEventListener('DOMContentLoaded', () => {
          updateCharCountAndButton();
          adjustTextareaHeight();
          userInputEl.focus();
      });
  </script>
</body>
</html>
`;
