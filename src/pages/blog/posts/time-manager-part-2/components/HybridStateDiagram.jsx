import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HybridStateDiagram({ lang }) {
  const [activeState, setActiveState] = useState('FF'); // FF | RT | CU

  const states = {
    FF: {
      id: 'FF',
      title: lang === 'zh' ? 'FastForward (快进模式)' : 'FastForward',
      desc: lang === 'zh' ? 'now() = static current。瞬间跳跃，每个 tick 精确执行。' : 'now() = static current. Instant jumps, precise executions.',
      color: 'from-blue-600 to-blue-400',
      next: 'RT',
      trigger: lang === 'zh' ? '进入 Barrier (LLM 被调用)' : 'Enter Barrier (LLM invoked)'
    },
    RT: {
      id: 'RT',
      title: lang === 'zh' ? 'Realtime (实时模式)' : 'Realtime',
      desc: lang === 'zh' ? 'now() = anchor + 真实流逝时间。主循环阻塞，等待外部任务完成。' : 'now() = anchor + elapsed time. Main loop blocked waiting.',
      color: 'from-amber-500 to-yellow-400',
      next: 'CU',
      trigger: lang === 'zh' ? '退出 Barrier (LLM 返回)' : 'Exit Barrier (LLM returns)'
    },
    CU: {
      id: 'CU',
      title: lang === 'zh' ? 'CatchUp (追赶模式)' : 'CatchUp',
      desc: lang === 'zh' ? '批量弹出过期 tick，并合并(coalesce)至最新时间戳。' : 'Batch pop overdue ticks, coalesce to latest timestamp.',
      color: 'from-emerald-600 to-green-400',
      next: 'FF',
      trigger: lang === 'zh' ? '追赶完成，继续回测' : 'Catchup done, resume backtest'
    }
  };

  const current = states[activeState];

  return (
    <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col items-center my-10 backdrop-blur-md">
      <div className="text-center mb-8">
        <h3 className="text-xl md:text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-500">
          {lang === 'zh' ? '三态引擎模型 / Three-State Hybrid Engine' : 'Three-State Hybrid Engine Model'}
        </h3>
        <p className="text-gray-400 mt-2 text-sm max-w-lg mx-auto">
          {lang === 'zh' 
            ? '点击节点观察 TimeManager 在处理耗时 LLM 请求时的状态机流转。'
            : 'Click states to observe the TimeManager state machine when handling slow LLM requests.'}
        </p>
      </div>

      <div className="w-full max-w-3xl flex flex-col md:flex-row justify-between items-center gap-4 relative">
        {['FF', 'RT', 'CU'].map((st, i) => (
          <React.Fragment key={st}>
            <motion.div 
              className={`relative z-10 flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer shadow-lg w-full md:w-1/3 transition-all duration-300 border
                ${activeState === st ? 'bg-white/10 border-white/30 scale-105' : 'bg-white/5 border-white/5 hover:bg-white/10 opacity-70'}
              `}
              onClick={() => setActiveState(st)}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              {activeState === st && (
                <motion.div 
                  layoutId="active-glow" 
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${states[st].color} opacity-20 blur-xl`} 
                />
              )}
              <h4 className={`text-lg font-bold bg-clip-text text-transparent bg-gradient-to-br ${states[st].color}`}>
                {states[st].title.split(' ')[0]}
              </h4>
            </motion.div>
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeState}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-10 p-6 rounded-xl bg-white/5 border border-white/10 w-full max-w-2xl text-center shadow-inner"
        >
          <div className={`inline-block mb-4 px-3 py-1 rounded-full text-xs font-mono uppercase bg-gradient-to-r ${current.color} text-white/90`}>
            {current.id} State
          </div>
          <p className="text-gray-200 text-lg mb-6 leading-relaxed">
            {current.desc}
          </p>
          <button 
            onClick={() => setActiveState(current.next)}
            className="group flex items-center justify-center mx-auto gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all"
          >
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
               {current.trigger} 
            </span>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
