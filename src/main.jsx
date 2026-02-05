import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, UserCheck, Ship, ChevronRight, Save, 
  CheckCircle2, UserPlus, ArrowRightLeft, LayoutDashboard
} from 'lucide-react';

// --- 配置區 ---
const API_URL = "https://script.google.com/macros/s/AKfycbwDJJyErUOrlzErXIzQmT5Fehr79gBDrxd547ihP5OEqhyH9G0p2o8EsCOZi0QoF36_/exec"; 
const LIFF_ID = "2009058776-fDhQPTf4"; 

const App = () => {
  const [activeTab, setActiveTab] = useState('signup');
  const [profiles, setProfiles] = useState([]);
  const [practiceDates, setPracticeDates] = useState([]);
  const [attendance, setAttendance] = useState({}); 
  const [currentUser, setCurrentUser] = useState(null);
  const [proxyUser, setProxyUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("正在讀取雲端試算表...");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (LIFF_ID && window.liff) {
          await window.liff.init({ liffId: LIFF_ID });
          if (!window.liff.isLoggedIn()) {
            window.liff.login();
            return;
          }
        }
        const userId = LIFF_ID && window.liff ? (await window.liff.getProfile()).userId : "MOCK_USER_ID";
        const res = await fetch(`${API_URL}?action=getInitialData`);
        const data = await res.json();
        setProfiles(data.profiles);
        setPracticeDates(data.dates);
        setAttendance(data.attendanceMap || {});
        setSelectedDate(data.dates[0]);
        const boundUser = data.profiles.find(p => p.lineId === userId);
        if (boundUser) {
          setCurrentUser(boundUser);
          setProxyUser(boundUser);
        }
        setLoading(false);
      } catch (err) {
        console.error("初始化失敗:", err);
        setLoadingMsg("連線失敗，請檢查網路");
      }
    };
    initializeApp();
  }, []);

  const handleBindUser = async (name) => {
    setIsSaving(true);
    try {
      const userId = LIFF_ID && window.liff ? (await window.liff.getProfile()).userId : "MOCK_USER_ID";
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'bindLineId', name, lineId: userId })
      });
      const user = profiles.find(p => p.name === name);
      setCurrentUser(user);
      setProxyUser(user);
      showToast(`歡迎回來，${name}！已綁定。`);
    } catch (err) {
      showToast("綁定失敗");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAttendance = (date) => {
    const key = `${proxyUser.name}_${date}`;
    const currentVal = attendance[key];
    setAttendance(prev => ({
      ...prev,
      [key]: currentVal === '參加' ? '不參加' : '參加'
    }));
  };

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const updates = {};
      practiceDates.forEach(date => {
        updates[date] = attendance[`${proxyUser.name}_${date}`] || '不參加';
      });
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateAttendance', name: proxyUser.name, updates })
      });
      showToast('出席記錄已儲存！');
    } catch (err) {
      showToast("儲存失敗");
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const dashboardStats = useMemo(() => {
    const attendees = profiles.filter(p => attendance[`${p.name}_${selectedDate}`] === '參加');
    const male = attendees.filter(p => p.gender === '男').length;
    const female = attendees.filter(p => p.gender === '女').length;
    const manifest = {
      Left: attendees.filter(p => p.position.includes('左')),
      Right: attendees.filter(p => p.position.includes('右')),
      Staff: attendees.filter(p => p.position.includes('舵') || p.position.includes('鼓')),
    };
    return { total: attendees.length, male, female, manifest };
  }, [selectedDate, attendance, profiles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1a12] flex items-center justify-center text-emerald-500 font-bold">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p>{loadingMsg}</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a1a12] flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-[#142820] border border-emerald-900/50 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-center mb-6">身分認領</h1>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {profiles.map(p => (
              <button key={p.name} onClick={() => handleBindUser(p.name)} className="w-full p-4 bg-[#0d1f18] border border-emerald-900/30 rounded-xl text-left flex justify-between items-center group">
                <span className="font-bold">{p.name}</span>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-500" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1a12] text-white">
      <nav className="sticky top-0 z-40 bg-[#0a1a12]/95 backdrop-blur-md border-b border-emerald-900/30 h-16 flex items-center justify-between px-4">
        <div className="flex bg-[#0d1f18] p-1 rounded-xl">
          <button onClick={() => setActiveTab('signup')} className={`px-4 py-2 rounded-lg font-bold text-xs ${activeTab === 'signup' ? 'bg-emerald-500 text-[#0a1a12]' : 'text-gray-500'}`}>我要報名</button>
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-bold text-xs ${activeTab === 'dashboard' ? 'bg-emerald-500 text-[#0a1a12]' : 'text-gray-500'}`}>出席看板</button>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-emerald-500 font-bold uppercase">Paddler</div>
          <div className="text-sm font-bold">{currentUser.name}</div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-32">
        {activeTab === 'signup' ? (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="bg-[#142820] p-4 rounded-2xl border border-emerald-900/30 mb-8">
              <label className="text-[10px] font-bold text-emerald-500 uppercase block mb-1">代理人模式 (代報名)</label>
              <select value={proxyUser.name} onChange={(e) => setProxyUser(profiles.find(p => p.name === e.target.value))} className="w-full bg-[#0d1f18] border border-emerald-900/50 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none">
                {profiles.map(p => <option key={p.name} value={p.name}>{p.name}{p.name === currentUser.name ? ' (本人)' : ''}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              {practiceDates.map(date => {
                const isAttending = attendance[`${proxyUser.name}_${date}`] === '參加';
                return (
                  <div key={date} onClick={() => toggleAttendance(date)} className="bg-[#142820] border border-emerald-900/20 rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98]">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isAttending ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-gray-800/30 border-gray-700/30'}`}><Calendar className={`w-5 h-5 ${isAttending ? 'text-emerald-500' : 'text-gray-600'}`} /></div>
                      <div><div className="font-bold">{date}</div><div className="text-[11px] text-gray-500">點擊切換狀態</div></div>
                    </div>
                    <div className={`relative w-14 h-8 rounded-full transition-colors ${isAttending ? 'bg-emerald-500' : 'bg-gray-700'}`}><div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${isAttending ? 'translate-x-6' : 'translate-x-0'}`} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="flex items-center justify-between mb-8 bg-[#142820] p-4 rounded-2xl border border-emerald-900/30">
              <h2 className="font-bold text-gray-400 text-sm">選擇日期</h2>
              <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-[#0d1f18] border border-emerald-900/50 rounded-xl px-4 py-2 font-bold text-emerald-400">
                {practiceDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-8 text-center">
              <div className="bg-[#142820] p-4 rounded-2xl border border-emerald-900/20"><div className="text-[10px] text-gray-500 mb-1">總出席</div><div className="text-2xl font-black text-emerald-400">{dashboardStats.total}</div></div>
              <div className="bg-[#142820] p-4 rounded-2xl border border-emerald-900/20"><div className="text-[10px] text-gray-500 mb-1">男生</div><div className="text-2xl font-black text-blue-400">{dashboardStats.male}</div></div>
              <div className="bg-[#142820] p-4 rounded-2xl border border-emerald-900/20"><div className="text-[10px] text-gray-500 mb-1">女生</div><div className="text-2xl font-black text-pink-400">{dashboardStats.female}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['Left', 'Right'].map(side => (
                <div key={side} className="space-y-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase">{side === 'Left' ? '左槳' : '右槳'}</div>
                  {dashboardStats.manifest[side].map(p => (
                    <div key={p.name} className={`p-3 bg-[#142820] border-${side === 'Left' ? 'l' : 'r'}-4 border-emerald-500 rounded-xl flex justify-between text-sm font-bold`}>
                      <span>{p.name}</span><span className="text-[10px] opacity-50">{p.gender}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {activeTab === 'signup' && (
        <div className="fixed bottom-8 right-6">
          <button onClick={handleUpdate} disabled={isSaving} className="flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-[#0a1a12] rounded-2xl font-black shadow-2xl disabled:opacity-50 transition-all">
            {isSaving ? <div className="w-5 h-5 border-2 border-[#0a1a12]/30 border-t-[#0a1a12] rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            儲存變更
          </button>
        </div>
      )}

      {toast && <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-[#0a1a12] px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4"><CheckCircle2 className="w-4 h-4" />{toast}</div>}
    </div>
  );
};

export default App;
