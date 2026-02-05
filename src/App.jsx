import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, UserCheck, Ship, ChevronRight, Save, 
  CheckCircle2, UserPlus, ArrowRightLeft, LayoutDashboard
} from 'lucide-react';

// --- 配置區 ---
const API_URL = "https://script.google.com/macros/s/AKfycbwDJJyErUOrlzErXIzQmT5Fehr79gBDrxd547ihP5OEqhyH9G0p2o8EsCOZi0QoF36_/exec"; 
const LIFF_ID = "2009058776-fDhQPTf4"; // 👈 已填入您的 LIFF ID

const App = () => {
  const [activeTab, setActiveTab] = useState('signup');
  const [profiles, setProfiles] = useState([]);
  const [practiceDates, setPracticeDates] = useState([]);
  const [attendance, setAttendance] = useState({}); 
  const [currentUser, setCurrentUser] = useState(null);
  const [proxyUser, setProxyUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("正在連線至雲端試算表...");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // --- 初始化 LIFF 與 讀取數據 ---
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoadingMsg("正在初始化 LINE LIFF...");
        
        // 初始化 LIFF
        if (LIFF_ID && window.liff) {
          await window.liff.init({ liffId: LIFF_ID });
          if (!window.liff.isLoggedIn()) {
            window.liff.login();
            return;
          }
        }

        const userId = LIFF_ID && window.liff ? (await window.liff.getProfile()).userId : "MOCK_USER_ID";
        
        setLoadingMsg("正在讀取隊員數據...");
        const res = await fetch(`${API_URL}?action=getInitialData`);
        const data = await res.json();
        
        setProfiles(data.profiles);
        setPracticeDates(data.dates);
        setAttendance(data.attendanceMap || {});
        setSelectedDate(data.dates[0]);

        // 根據 LINE UserId 檢查綁定狀況
        const boundUser = data.profiles.find(p => p.lineId === userId);
        if (boundUser) {
          setCurrentUser(boundUser);
          setProxyUser(boundUser);
        }
        setLoading(false);
      } catch (err) {
        console.error("初始化失敗:", err);
        setLoadingMsg("連線失敗，請檢查網路或 LIFF 設定");
      }
    };

    initializeApp();
  }, []);

  // --- 身份綁定 (US-01) ---
  const handleBindUser = async (name) => {
    setIsSaving(true);
    try {
      const userId = LIFF_ID && window.liff ? (await window.liff.getProfile()).userId : "MOCK_USER_ID";
      
      if (API_URL) {
        await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'bindLineId', name, lineId: userId })
        });
      }
      const user = profiles.find(p => p.name === name);
      setCurrentUser(user);
      setProxyUser(user);
      showToast(`歡迎回來，${name}！身份已綁定。`);
    } catch (err) {
      showToast("綁定失敗，請聯繫管理員");
    } finally {
      setIsSaving(false);
    }
  };

  // --- 出席操作 ---
  const toggleAttendance = (date) => {
    const key = `${proxyUser.name}_${date}`;
    const currentVal = attendance[key];
    setAttendance(prev => ({
      ...prev,
      [key]: currentVal === '參加' ? '不參加' : '參加'
    }));
  };

  // --- 批量更新 ---
  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      if (API_URL) {
        const updates = {};
        practiceDates.forEach(date => {
          updates[date] = attendance[`${proxyUser.name}_${date}`] || '不參加';
        });

        await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'updateAttendance', 
            name: proxyUser.name, 
            updates 
          })
        });
      }
      showToast('出席記錄已儲存！');
    } catch (err) {
      showToast("儲存失敗，請檢查網路");
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- 排船數據計算 ---
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
        <div className="flex flex-col items-center gap-4 text-center px-6">
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
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <UserPlus className="w-8 h-8 text-[#0a1a12]" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">身分認領</h1>
          <p className="text-gray-400 text-center mb-8 text-sm">偵測到新裝置，請認領您的姓名以完成綁定</p>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {profiles.length > 0 ? profiles.map(p => (
              <button
                key={p.name}
                onClick={() => handleBindUser(p.name)}
                className="w-full p-4 bg-[#0d1f18] border border-emerald-900/30 rounded-xl text-left hover:border-emerald-500 transition-all flex justify-between items-center group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold">{p.name}</span>
                  <span className="text-[10px] text-gray-500 px-2 py-0.5 bg-black/30 rounded-md">{p.position}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-500" />
              </button>
            )) : <p className="text-center text-gray-600 py-4">無成員資料</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1a12] text-white font-sans">
      <nav className="sticky top-0 z-40 bg-[#0a1a12]/95 backdrop-blur-md border-b border-emerald-900/30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex bg-[#0d1f18] p-1 rounded-xl">
            {['signup', 'dashboard'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === tab ? 'bg-emerald-500 text-[#0a1a12]' : 'text-gray-500'}`}
              >
                {tab === 'signup' ? '我要報名' : '出席看板'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
             <div className="text-right">
                <div className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Paddler</div>
                <div className="text-sm font-bold">{currentUser.name}</div>
             </div>
             <div className="w-9 h-9 rounded-full bg-emerald-900/50 flex items-center justify-center border border-emerald-500/20">
                <UserCheck className="w-4 h-4 text-emerald-400" />
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-32">
        {activeTab === 'signup' ? (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="bg-[#142820] p-4 rounded-2xl border border-emerald-900/30 mb-8">
              <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 block">代理人模式 (選取隊員代報)</label>
              <div className="relative">
                <select 
                  value={proxyUser.name}
                  onChange={(e) => setProxyUser(profiles.find(p => p.name === e.target.value))}
                  className="w-full bg-[#0d1f18] border border-emerald-900/50 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-emerald-500 appearance-none"
                >
                  {profiles.map(p => (
                    <option key={p.name} value={p.name}>{p.name}{p.name === currentUser.name ? ' (本人)' : ''}</option>
                  ))}
                </select>
                <ArrowRightLeft className="absolute right-4 top-3.5 w-4 h-4 text-emerald-500/50 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              {practiceDates.map(date => {
                const isAttending = attendance[`${proxyUser.name}_${date}`] === '參加';
                return (
                  <div 
                    key={date}
                    onClick={() => toggleAttendance(date)}
                    className="bg-[#142820] border border-emerald-900/20 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-emerald-700/50 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isAttending ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-gray-800/30 border-gray-700/30'}`}>
                        <Calendar className={`w-5 h-5 ${isAttending ? 'text-emerald-500' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex flex-col">
                        <div className="font-bold text-base leading-tight">{date}</div>
                        <div className="text-[11px] text-gray-500 mt-1">點擊切換狀態</div>
                      </div>
                    </div>
                    <div className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${isAttending ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 transform ${isAttending ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="flex items-center justify-between mb-8 bg-[#142820] p-4 rounded-2xl border border-emerald-900/30 shadow-sm">
              <h2 className="font-bold text-gray-400 text-sm">選擇練習日期</h2>
              <select 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#0d1f18] border border-emerald-900/50 rounded-xl px-4 py-2 font-bold text-emerald-400 focus:outline-none text-sm"
              >
                {practiceDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { label: '總出席', val: dashboardStats.total, color: 'text-emerald-400' },
                { label: '男生', val: dashboardStats.male, color: 'text-blue-400' },
                { label: '女生', val: dashboardStats.female, color: 'text-pink-400' }
              ].map(stat => (
                <div key={stat.label} className="bg-[#142820] p-5 rounded-2xl border border-emerald-900/20 text-center shadow-lg">
                  <div className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-tighter">{stat.label}</div>
                  <div className={`text-3xl font-black ${stat.color}`}>{stat.val}</div>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              {dashboardStats.manifest.Staff.length > 0 && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 shadow-inner">
                  <div className="flex items-center gap-2 mb-4 text-emerald-400 text-xs font-bold tracking-widest">
                    <Ship className="w-4 h-4" /> 舵手與鼓手 (STAFF)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dashboardStats.manifest.Staff.map(p => (
                      <span key={p.name} className="px-4 py-2 bg-[#0d1f18] border border-emerald-500/30 rounded-xl text-sm font-bold flex items-center gap-2">
                        {p.name}
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 rounded uppercase font-normal">{p.position}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {['Left', 'Right'].map(side => {
                  const label = side === 'Left' ? '左槳' : '右槳';
                  const key = side === 'Left' ? 'Left' : 'Right';
                  return (
                    <div key={side} className="space-y-3">
                      <div className={`flex items-center gap-2 px-1 text-[11px] font-bold text-gray-500 ${side === 'Right' ? 'flex-row-reverse' : ''}`}>
                        <LayoutDashboard className="w-3 h-3" /> {label}
                      </div>
                      {dashboardStats.manifest[key].length > 0 ? (
                        dashboardStats.manifest[key].map(p => (
                          <div 
                            key={p.name} 
                            className={`p-4 bg-[#142820] border-${side === 'Left' ? 'l' : 'r'}-4 border-${side === 'Left' ? 'l' : 'r'}-emerald-500 border border-emerald-900/20 rounded-xl font-bold flex justify-between items-center shadow-md`}
                          >
                            <span className="text-sm">{p.name}</span>
                            <span className={`text-[10px] font-medium ${p.gender === '男' ? 'text-blue-500/70' : 'text-pink-500/70'}`}>
                              {p.gender}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-gray-700 py-10 text-center border border-dashed border-gray-800/50 rounded-2xl bg-black/5">
                          尚無出席
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {activeTab === 'signup' && (
        <div className="fixed bottom-8 left-0 right-0 px-6 pointer-events-none">
          <div className="max-w-4xl mx-auto flex justify-end">
            <button 
              onClick={handleUpdate}
              disabled={isSaving}
              className="pointer-events-auto flex items-center gap-3 px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-[#0a1a12] rounded-2xl font-black text-lg shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? <div className="w-6 h-6 border-3 border-[#0a1a12]/30 border-t-[#0a1a12] rounded-full animate-spin" /> : <Save className="w-6 h-6" />}
              更新出席表
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-[#0a1a12] px-8 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 animate-in zoom-in slide-in-from-top-6 duration-300">
          <CheckCircle2 className="w-5 h-5" />
          {toast}
        </div>
      )}
    </div>
  );
};

export default App;
