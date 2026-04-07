"use client";

import { useChat } from '@ai-sdk/react';
import { Bot, Send, User, Download, Play, CheckCircle, XCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

// Utility to extract JSON blocks from markdown
function extractJsonBlock(text: string) {
  const jsonRegex = /```json\n([\s\S]*?)\n```/;
  const match = text.match(jsonRegex);
  return match ? match[1] : null;
}

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [evaluatingMsgId, setEvaluatingMsgId] = useState<string | null>(null);
  const [evalResults, setEvalResults] = useState<Record<string, {success: boolean, output: string}>>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleDownload = (jsonString: string) => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "n8n-workflow.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEvaluate = async (jsonString: string, messageId: string) => {
    setEvaluatingMsgId(messageId);
    try {
      const parsed = JSON.parse(jsonString);
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowJson: parsed })
      });
      const data = await res.json();
      setEvalResults(prev => ({
        ...prev,
        [messageId]: data
      }));
    } catch (err: any) {
      setEvalResults(prev => ({
        ...prev,
        [messageId]: { success: false, output: err.message || "Unknown error" }
      }));
    } finally {
      setEvaluatingMsgId(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 font-sans">
      <header className="py-4 px-6 border-b border-neutral-800 bg-neutral-900 flex items-center gap-3 shadow-md">
        <Bot className="w-8 h-8 text-emerald-400" />
        <h1 className="text-xl font-bold tracking-tight">n8n Agent Builder</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-20">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full mt-20 text-center opacity-60">
              <Bot className="w-16 h-16 mb-4 text-emerald-500" />
              <p className="text-lg mb-2">¡Hola! Soy tu asistente para crear flujos de n8n.</p>
              <p className="text-sm max-w-md">Dime qué quieres automatizar. Por ejemplo: "Quiero un flujo que lea nuevos correos de Gmail y envíe una notificación por Telegram."</p>
            </div>
          ) : (
            messages.map(m => {
              const isUser = m.role === 'user';
              const jsonBlock = !isUser ? extractJsonBlock(m.content) : null;
              // Remove the json block from the displayed text if it exists so we just show the friendly text
              const displayText = jsonBlock
                ? m.content.replace(/```json\n[\s\S]*?\n```/, '').trim()
                : m.content;

              return (
                <div key={m.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isUser ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                    {isUser ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${isUser ? 'bg-indigo-900/40 text-indigo-100 border border-indigo-800' : 'bg-neutral-800/60 border border-neutral-700'}`}>
                    <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                      {displayText || (jsonBlock ? "Aquí tienes tu flujo generado:" : m.content)}
                    </div>

                    {jsonBlock && (
                      <div className="mt-4 flex flex-col gap-3">
                        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-700 shadow-inner">
                           <div className="flex items-center justify-between mb-2">
                             <span className="text-xs font-mono text-emerald-400">n8n-workflow.json</span>
                             <div className="flex gap-2">
                               <button
                                  onClick={() => handleEvaluate(jsonBlock, m.id)}
                                  disabled={evaluatingMsgId === m.id}
                                  className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                                >
                                  {evaluatingMsgId === m.id ? (
                                    <span className="animate-pulse">Probando...</span>
                                  ) : (
                                    <>
                                      <Play className="w-3 h-3" /> Probar en VM
                                    </>
                                  )}
                               </button>
                               <button
                                  onClick={() => handleDownload(jsonBlock)}
                                  className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded transition-colors"
                                >
                                  <Download className="w-3 h-3" /> Descargar
                               </button>
                             </div>
                           </div>

                           {/* Evaluation Results */}
                           {evalResults[m.id] && (
                             <div className={`mt-3 p-3 rounded-md text-xs font-mono overflow-x-auto ${evalResults[m.id].success ? 'bg-green-900/30 border border-green-800 text-green-300' : 'bg-red-900/30 border border-red-800 text-red-300'}`}>
                               <div className="flex items-center gap-2 mb-1">
                                 {evalResults[m.id].success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                 <span className="font-semibold">{evalResults[m.id].success ? 'Prueba exitosa' : 'Error en la prueba'}</span>
                               </div>
                               <pre className="mt-2 whitespace-pre-wrap">{evalResults[m.id].output}</pre>
                             </div>
                           )}

                           <div className="text-xs text-neutral-400 mt-3 pt-3 border-t border-neutral-800">
                              <p className="font-semibold mb-1">¿Cómo importar?</p>
                              <ol className="list-decimal list-inside space-y-1 ml-1">
                                <li>Descarga el archivo usando el botón de arriba.</li>
                                <li>Abre tu instancia de n8n.</li>
                                <li>Ve al menú superior derecho y selecciona <strong>Import from File...</strong></li>
                                <li>Selecciona el archivo descargado.</li>
                              </ol>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-emerald-600/50">
                <Bot className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex items-center">
                 {/* Glowing Thinking Animation */}
                 <div className="text-neutral-500 flex items-center gap-2 font-medium">
                   <span className="animate-pulse relative">
                     Thinking
                     {/* Glow effect */}
                     <span className="absolute -inset-1 rounded-lg blur opacity-30 bg-neutral-400 animate-pulse"></span>
                   </span>
                   <span className="flex gap-1">
                     <span className="w-1 h-1 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                     <span className="w-1 h-1 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                     <span className="w-1 h-1 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                   </span>
                 </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-red-600/50">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div className="max-w-[80%] rounded-2xl px-5 py-4 bg-red-900/40 text-red-100 border border-red-800">
                <p className="font-semibold mb-1">Hubo un error de conexión con la IA.</p>
                <p className="text-sm">{error.message || "Error desconocido"}</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />

        </div>
      </main>

      <footer className="p-4 bg-neutral-900 border-t border-neutral-800">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-end gap-2">
          <textarea
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-neutral-500"
            rows={1}
            value={input}
            onChange={handleInputChange}
            placeholder="Describe el flujo que necesitas..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Trigger form submit
                const form = e.currentTarget.form;
                if (form) form.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 bottom-2 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}
