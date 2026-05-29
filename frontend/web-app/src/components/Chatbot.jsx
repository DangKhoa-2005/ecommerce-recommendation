import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Menu } from 'lucide-react'
import { useAuthStore } from '../store'
import { chatbotAPI } from '../services/api'

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Xin chào! Tôi là trợ lý của Mini Shop. Tôi có thể giúp bạn tìm sản phẩm phù hợp. Bạn đang tìm kiếm gì?'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  
  const { isAuthenticated } = useAuthStore()
  
  useEffect(() => {
    if (isOpen) {
      loadSuggestions()
    }
  }, [isOpen])
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  const loadSuggestions = async () => {
    try {
      const response = await chatbotAPI.getSuggestions()
      setSuggestions(response.data.data)
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    }
  }
  
  // Đảm bảo luôn lấy history mới nhất khi gửi tin nhắn (kể cả khi chọn nhanh)
  // Gửi tin nhắn user (dùng cho cả input và menu)
  const sendUserMessage = async (text) => {
    console.log('ChatBot: sendUserMessage called with:', text)
    if (!text || !text.trim() || isLoading) return;
    // Sanitize message: remove leading emojis/symbols and normalize whitespace
    let userMessage = text.replace(/^[^\p{L}\p{N}]+/u, '').trim();
    console.log('ChatBot: sanitized message:', userMessage)
    setInput('');
    // Lấy history mới nhất
    // Use functional update to ensure latest messages
    // Append message and compute history snapshot atomically using functional update
    let historySnapshot;
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, { role: 'user', content: userMessage }];
      historySnapshot = newMessages.slice(-10);
      return newMessages;
    });
    setIsLoading(true);
    try {
      const response = await chatbotAPI.chat({
        message: userMessage,
        history: historySnapshot
      });
      const botResponse = response.data.data.response;
      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
      console.log('ChatBot: botResponse:', botResponse)
    } catch (error) {
      console.error('ChatBot: chat API error', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Gửi từ input
  const handleSend = () => sendUserMessage(input);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  return (
    <>
      {/* Chat button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center z-50"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-primary-600 text-white px-4 py-3 flex items-center gap-3 relative">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Mini Shop Assistant</h3>
              <p className="text-xs text-white/80">Tư vấn sản phẩm 24/7</p>
            </div>
            {/* Hamburger menu button */}
            <button
              className="ml-auto p-2 rounded-full hover:bg-white/20 transition-colors"
              title="Xem các gợi ý nhanh"
              onClick={() => setShowMenu((v) => !v)}
            >
              <Menu className="w-6 h-6" />
            </button>
            {/* Popup menu */}
            {showMenu && (
              <div className="absolute top-14 right-2 w-72 bg-white text-gray-900 rounded-xl shadow-lg border border-gray-100 z-50 animate-fadeIn">
                <div className="p-3 border-b font-semibold text-primary-700">Chọn nhanh chủ đề</div>
                <div className="p-2 flex flex-col gap-2 max-h-72 overflow-y-auto">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setShowMenu(false);
                        sendUserMessage(s);
                      }}
                      className="text-left px-3 py-2 rounded-lg hover:bg-primary-50 text-sm transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-primary-100' : 'bg-gray-200'
                }`}>
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-primary-600" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-sm'
                    : 'bg-white shadow-sm rounded-tl-sm'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="bg-white shadow-sm px-4 py-2 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Suggestions - always visible when few messages */}
          {suggestions.length > 0 && messages.length < 5 && (
            <div className="px-4 py-3 border-t bg-white">
              <p className="text-xs text-gray-500 mb-2 font-medium">💡 Gợi ý câu hỏi:</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {suggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => sendUserMessage(suggestion)}
                    className="text-xs px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 transition-colors border border-primary-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Chatbot
