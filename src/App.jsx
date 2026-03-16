import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  Menu, 
  Plus, 
  MessageSquare, 
  User, 
  Bot, 
  ChevronLeft,
  Sparkles,
  Trash2,
  Settings,
  LogOut,
  Copy,
  Check,
  Terminal,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Mic,
  MicOff,
  Download,
  FileText,
  FileJson as FileCode
} from 'lucide-react';

const SUPABASE_API_URL = "https://qrapupfnpeuaaahalctv.supabase.co/functions/v1/cloud_chat-ai"; 

const TRANSLATIONS = {
  ru: {
    newChat: "Новый чат",
    recent: "Недавние диалоги",
    settings: "Настройки",
    placeholder: "Задайте свой вопрос...",
    assistantName: "Cloud Chat",
    assistantSub: "Ваш персональный ассистент",
    online: "В сети",
    historyEmpty: "История очищена. Чем могу помочь?",
    lang: "Язык интерфейса",
    copied: "Скопировано!",
    warning: "AI может ошибаться. Его ответы нужно проверять",
    greeting: "Чем я могу помочь вам сегодня?",
    download: "Скачать диалог",
    starters: [
      "Объясни квантовые вычисления простыми словами",
      "Напиши код змейки на Python",
      "Как приготовить идеальную пасту карбонара?",
      "Составь план тренировок для дома на неделю"
    ]
  },
  en: {
    newChat: "New Chat",
    recent: "Recent Dialogs",
    settings: "Settings",
    placeholder: "Ask your question...",
    assistantName: "Cloud Chat",
    assistantSub: "Your personal assistant",
    online: "Online",
    historyEmpty: "History cleared. How can I help?",
    lang: "Interface Language",
    copied: "Copied!",
    warning: "AI can make mistakes. Check important info.",
    greeting: "How can I help you today?",
    download: "Download Chat",
    starters: [
      "Explain quantum computing in simple terms",
      "Write a snake game code in Python",
      "How to cook the perfect pasta carbonara?",
      "Create a home workout plan for a week"
    ]
  }
};

const App = () => {
  const [lang, setLang] = useState('ru');
  const t = TRANSLATIONS[lang];

  const [chats, setChats] = useState([
    { id: '1', title: TRANSLATIONS['ru'].newChat, messages: [] }
  ]);
  const [activeChatId, setActiveChatId] = useState('1');
  const [inputText, setInputText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [messageFeedback, setMessageFeedback] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const messagesEndRef = useRef(null);
  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId), [chats, activeChatId]);

  // Voice Recognition Setup
  const recognition = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = lang === 'ru' ? 'ru-RU' : 'en-US';

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognition.current.onerror = () => setIsListening(false);
      recognition.current.onend = () => setIsListening(false);
    }
  }, [lang]);

  const toggleListening = () => {
    if (isListening) {
      recognition.current?.stop();
    } else {
      recognition.current?.start();
      setIsListening(true);
    }
  };

  // Download Logic
  const downloadChat = (format) => {
    if (!activeChat || activeChat.messages.length === 0) return;

    let content = '';
    let mimeType = 'text/plain';
    let fileName = `chat-${activeChat.title.replace(/\s+/g, '_')}-${Date.now()}`;

    if (format === 'json') {
      content = JSON.stringify(activeChat.messages, null, 2);
      mimeType = 'application/json';
      fileName += '.json';
    } else {
      content = activeChat.messages
        .map(m => `${m.role === 'user' ? 'YOU' : 'AI'}:\n${m.text}\n`)
        .join('\n---\n\n');
      fileName += '.txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, isLoading]);

  const createNewChat = () => {
    const newId = Date.now().toString();
    const newChat = {
      id: newId,
      title: t.newChat,
      messages: []
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newId);
    setInputText('');
  };

  const deleteChat = (id, e) => {
    e.stopPropagation();
    if (chats.length === 1) return;
    const newChats = chats.filter(c => c.id !== id);
    setChats(newChats);
    if (activeChatId === id) setActiveChatId(newChats[0].id);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    });
  };

  // Logic to update chat title based on context
  const updateChatTitle = async (chatId, userMessage) => {
    const prompt = `Create a very short title (max 5 words) for a chat that starts with this message: "${userMessage}". Output ONLY the title text, no quotes, no period. Language: ${lang === 'ru' ? 'Russian' : 'English'}.`;
    
    try {
      const response = await fetch(SUPABASE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
      });
      const data = await response.json();
      const newTitle = data.choices?.[0]?.message?.content?.trim() || userMessage.substring(0, 20);
      
      setChats(prev => prev.map(c => 
        c.id === chatId ? { ...c, title: newTitle } : c
      ));
    } catch (e) {
      console.error("Failed to update title", e);
    }
  };

  const generateSuggestions = async (lastMessage) => {
    const prompt = `Based on this AI response: "${lastMessage}". Suggest 3 short, relevant follow-up questions. Return ONLY a JSON array of strings in ${lang === 'ru' ? 'Russian' : 'English'}. Do not include markdown formatting like \`\`\`json.`;
    
    try {
      const response = await fetch(SUPABASE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
      });
      const data = await response.json();
      let textContent = data.choices?.[0]?.message?.content || "[]";
      textContent = textContent.replace(/```json\n?|\n?```/g, '').trim();
      const suggestions = JSON.parse(textContent);
      return Array.isArray(suggestions) ? suggestions.slice(0, 3) : [];
    } catch (e) {
      return [];
    }
  };

  const sendMessage = async (e, overrideText = null) => {
    if (e) e.preventDefault();
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userText = textToSend;
    const currentChatId = activeChatId;
    const isFirstMessage = activeChat?.messages.length === 0;

    setChats(prev => prev.map(c => 
      c.id === currentChatId 
        ? { 
            ...c, 
            messages: c.messages.map(m => ({...m, suggestions: []})).concat({ role: 'user', text: userText, isNew: true }) 
          }
        : c
    ));
    
    setInputText('');
    setIsLoading(true);

    const fetchWithRetry = async (retries = 5, delay = 1000) => {
      try {
        const history = activeChat?.messages.map(m => ({
          role: m.role,
          content: m.text
        })) || [];
        history.push({ role: 'user', content: userText });

        const response = await fetch(SUPABASE_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history })
        });

        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content || "Error generating response.";
        const suggestions = await generateSuggestions(aiText);

        setChats(prev => prev.map(c => 
          c.id === currentChatId 
            ? { ...c, messages: [...c.messages, { role: 'assistant', text: aiText, suggestions, isNew: true }] }
            : c
        ));

        // Trigger title update if it's the first exchange
        if (isFirstMessage) {
            updateChatTitle(currentChatId, userText);
        }

      } catch (error) {
        if (retries > 0) {
          setTimeout(() => fetchWithRetry(retries - 1, delay * 2), delay);
        } else {
          setChats(prev => prev.map(c => 
            c.id === currentChatId 
              ? { ...c, messages: [...c.messages, { role: 'assistant', text: "Connection error.", suggestions: [], isNew: true }] }
              : c
          ));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchWithRetry();
  };

  const formatMessage = (text) => {
    if (!text) return "";
    const parts = text.split(/```/);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        const lines = part.trim().split('\n');
        const language = lines[0];
        const code = lines.slice(1).join('\n');
        const blockId = `code-${index}`;

        return (
          <div key={index} className="my-6 group relative w-full overflow-hidden">
            <div className="absolute -inset-[1.5px] rounded-xl animated-gradient-slow opacity-100"></div>
            <div className="relative bg-[#0d0d12] rounded-[11px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a24] border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{language || 'code'}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(code || lines.join('\n'), blockId)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
                >
                  {copiedCodeId === blockId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className={`text-[10px] font-bold ${copiedCodeId === blockId ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {copiedCodeId === blockId ? t.copied : 'COPY'}
                  </span>
                </button>
              </div>
              <div className="p-4 overflow-x-auto custom-scrollbar bg-[#0d0d12]">
                <pre className="text-sm font-mono text-indigo-100 leading-relaxed whitespace-pre">
                  <code>{code || lines.join('\n')}</code>
                </pre>
              </div>
            </div>
          </div>
        );
      }

      const lines = part.split('\n');
      return lines.map((line, i) => {
        let formatted = line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
          .replace(/`(.*?)`/g, '<code class="bg-[#1a1a24] text-indigo-300 px-1.5 py-0.5 rounded font-mono text-[13px]">$1</code>');

        if (line.startsWith('* ') || line.startsWith('- ')) {
          return <li key={`${index}-${i}`} className="ml-5 list-disc mb-1 text-slate-300" dangerouslySetInnerHTML={{ __html: formatted.substring(2) }} />;
        }
        return line.trim() === "" ? <div key={`${index}-${i}`} className="h-2" /> : (
          <p key={`${index}-${i}`} className="mb-3 text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />
        );
      });
    });
  };

  return (
    <div className="flex h-screen bg-[#08080a] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 z-50 bg-[#0f0f14] border-r border-white/5 transition-transform duration-300
        ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full'}`}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">Cloud Chat</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors md:hidden">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={createNewChat}
            className="flex items-center gap-3 w-full p-3.5 mb-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-all text-sm font-semibold shadow-lg shadow-indigo-900/20 active:scale-95"
          >
            <Plus className="w-5 h-5 text-white" />
            {t.newChat}
          </button>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            <p className="px-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">{t.recent}</p>
            {chats.map((chat) => (
              <div 
                key={chat.id} 
                onClick={() => setActiveChatId(chat.id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group border ${
                  activeChatId === chat.id 
                    ? 'bg-[#1a1a24] border-indigo-500/30 text-white' 
                    : 'hover:bg-white/5 border-transparent text-slate-400'
                }`}
              >
                <MessageSquare className={`w-4 h-4 ${activeChatId === chat.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span className="text-sm truncate flex-1 font-medium">{chat.title}</span>
                {chats.length > 1 && (
                  <button 
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-white/5 space-y-1">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-slate-400"
            >
              <Settings className="w-4 h-4" /> {t.settings}
            </button>
            
            {showSettings && (
              <div className="p-3 bg-white/5 rounded-xl mb-2">
                <p className="text-[10px] text-slate-500 mb-2 uppercase font-bold">{t.lang}</p>
                <div className="flex gap-2">
                  {['ru', 'en'].map(l => (
                    <button 
                      key={l}
                      onClick={() => setLang(l)}
                      className={`flex-1 py-1.5 text-xs rounded-md border transition-all ${
                        lang === l ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-transparent border-white/10 text-slate-400'
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a24] border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">Premium User</p>
                <p className="text-[10px] text-indigo-400">Cloud Pro</p>
              </div>
              <LogOut className="w-4 h-4 text-slate-600 hover:text-red-400 cursor-pointer" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={`flex-1 flex flex-col h-full relative transition-all duration-300 overflow-hidden w-full
        ${isSidebarOpen ? 'md:ml-72' : 'ml-0'}`}
      >
        <header className="h-16 flex items-center justify-between px-6 z-30 bg-[#08080a] border-b border-white/5 w-full shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            {!isSidebarOpen && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }}
                className="p-2 bg-[#1a1a24] hover:bg-white/5 rounded-lg transition-all flex-shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-bold text-sm text-white truncate pr-4">
              {activeChat?.title || t.newChat}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 relative">
             {/* Download Dropdown */}
             <div className="relative">
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="p-2.5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white rounded-xl transition-all active:scale-95"
                  title={t.download}
                >
                  <Download className="w-4 h-4" />
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 mt-2 w-32 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    <button onClick={() => downloadChat('txt')} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-white/5 text-slate-300 transition-colors">
                      <FileText className="w-3.5 h-3.5 text-blue-400" /> TXT
                    </button>
                    <button onClick={() => downloadChat('json')} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-white/5 text-slate-300 transition-colors border-t border-white/5">
                      <FileCode className="w-3.5 h-3.5 text-amber-400" /> JSON
                    </button>
                  </div>
                )}
             </div>

            <button
              onClick={createNewChat}
              className="p-2.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-xl transition-all shadow-sm active:scale-95 group"
              title={t.newChat}
            >
              <Edit className="w-4 h-4 transition-transform group-hover:scale-110" />
            </button>
          </div>
        </header>

        <div 
          onClick={() => setShowDownloadMenu(false)}
          className={`flex-1 overflow-y-auto px-4 py-8 md:px-12 custom-scrollbar w-full flex flex-col ${
          activeChat?.messages.length === 0 ? 'justify-center' : 'justify-start'
        }`}>
          
          {activeChat?.messages.length === 0 && !isLoading ? (
            <div className="w-full max-w-3xl mx-auto flex flex-col items-center message-fly-in">
              <div className="relative mb-6">
                <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full"></div>
                <div className="relative w-16 h-16 rounded-2xl bg-[#1a1a24] border border-white/10 flex items-center justify-center shadow-2xl ring-1 ring-white/5">
                  <Sparkles className="w-8 h-8 text-indigo-400" />
                </div>
              </div>
              
              <h1 className="text-3xl md:text-5xl font-bold mb-10 text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 pb-2">
                {t.greeting}
              </h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                {t.starters.map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(null, starter)}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-300 text-left flex items-start gap-4 group active:scale-[0.98]"
                  >
                    <div className="mt-0.5 p-2 rounded-lg bg-black/20 text-indigo-400 group-hover:text-white group-hover:bg-indigo-500 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="text-[14px] text-slate-300 group-hover:text-white transition-colors leading-relaxed">
                      {starter}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full">
              {activeChat?.messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`mb-10 ${msg.isNew ? 'message-fly-in' : 'opacity-100'} w-full`}
                >
                  <div className={`flex gap-5 w-full ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                      ${msg.role === 'user' 
                        ? 'bg-indigo-600 shadow-lg shadow-indigo-600/30' 
                        : 'bg-[#1a1a24] border border-white/10 text-indigo-400'}`}>
                      {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5" />}
                    </div>
                    
                    <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className="text-[15px] break-words w-full">
                        {formatMessage(msg.text)}
                      </div>

                      {msg.role === 'assistant' && !isLoading && (
                        <div className="mt-4 flex flex-col gap-4">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setMessageFeedback(p => ({...p, [idx]: 'up'}))}
                              className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${messageFeedback[idx] === 'up' ? 'text-indigo-400 bg-white/5' : 'text-slate-500'}`}
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setMessageFeedback(p => ({...p, [idx]: 'down'}))}
                              className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${messageFeedback[idx] === 'down' ? 'text-red-400 bg-white/5' : 'text-slate-500'}`}
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => copyToClipboard(msg.text, `msg-${idx}`)}
                              className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-white/5 transition-colors text-slate-500"
                            >
                              {copiedCodeId === `msg-${idx}` ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          {msg.suggestions && msg.suggestions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {msg.suggestions.map((suggestion, sIdx) => (
                                <button
                                  key={sIdx}
                                  onClick={() => setInputText(suggestion)}
                                  className="relative p-[1.5px] rounded-full overflow-hidden group transition-all active:scale-95"
                                >
                                  <div className="absolute inset-0 animated-gradient-slow opacity-60 group-hover:opacity-100 transition-opacity"></div>
                                  <div className="relative px-4 py-1.5 bg-[#0f0f14] rounded-full text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                                    {suggestion}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-5 mb-10 message-fly-in">
                  <div className="w-9 h-9 rounded-xl bg-[#1a1a24] border border-white/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-4 pt-2">
                    <div className="h-4 w-[90%] rounded-lg animated-gradient-slow opacity-60 shadow-inner"></div>
                    <div className="h-4 w-[75%] rounded-lg animated-gradient-slow opacity-40 shadow-inner"></div>
                    <div className="h-4 w-[40%] rounded-lg animated-gradient-slow opacity-30 shadow-inner"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-4 md:px-12 md:pb-8 pt-0 w-full shrink-0">
          <form 
            onSubmit={sendMessage}
            className="max-w-4xl mx-auto w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`relative p-[1.5px] rounded-2xl overflow-hidden transition-all duration-500 ${
                isLoading ? 'animated-gradient-fast' : 'animated-gradient-slow'
              }`}>
              <div className="flex items-center bg-[#0f0f14] rounded-[15px] p-2 shadow-2xl">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t.placeholder}
                  className="flex-1 bg-transparent px-4 py-3 outline-none text-slate-200 placeholder:text-slate-600 text-[15px]"
                />
                
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-3 mr-1 rounded-xl transition-all active:scale-90 ${
                    isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-slate-500 hover:bg-white/5'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button 
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className={`p-3 rounded-xl transition-all active:scale-90 flex-shrink-0 ${
                    inputText.trim() && !isLoading 
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                      : 'bg-[#1a1a24] text-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="mt-4 flex flex-col items-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/5">
                <AlertCircle className="w-3 h-3 text-slate-500" />
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                  {t.warning}
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
        .animated-gradient-slow {
          background: linear-gradient(90deg, #1e1e2e, #4f46e5, #1e1e2e, #818cf8, #1e1e2e);
          background-size: 400% 400%;
          animation: moveGradient 8s ease infinite;
        }
        .animated-gradient-fast {
          background: linear-gradient(90deg, #4f46e5, #ef4444, #10b981, #4f46e5);
          background-size: 300% 300%;
          animation: moveGradient 2s linear infinite;
        }
        @keyframes moveGradient { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
        .message-fly-in { animation: flyIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1.0) forwards; opacity: 0; }
        @keyframes flyIn { 0% { opacity: 0; transform: translateY(20px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        pre { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        body { overscroll-behavior-y: contain; background-color: #08080a; }
      `}} />
    </div>
  );
};

export default App;

