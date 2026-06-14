import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('settings'); 
  const [totals, setTotals] = useState({ sessions: 0, focusTime: 0, solved: 0, aiBlocked: 0 });
   const [chartData, setChartData] = useState([]);
  const [timers, setTimers] = useState({
    difficulty: 25,
    tags: 25,
    hints: 25,
    acceptanceRate: 25
  });

  const [blockAI, setBlockAI] = useState(false);

  useEffect(() => {

    if (window.chrome !== undefined) {
      if (window.chrome.storage !== undefined) {

        chrome.storage.local.get(['timers', 'blockAI']).then((result) => {
          if (result.timers !== undefined){
            setTimers(result.timers);
          }

          if (result.blockAI !== undefined) {
            setBlockAI(result.blockAI);
          }
        });

      }
    }
  }, []);

  const handleTimerChange = (category, value) => {
    const newTimers = { ...timers, [category]: Number(value) };
    setTimers(newTimers);

    if (window.chrome !== undefined) {
      if (window.chrome.storage !== undefined) {
        
        chrome.storage.local.set({ timers: newTimers });
      }
    }
  };

  const handleToggleAI = (checked) => {
    setBlockAI(checked);

    if (window.chrome !== undefined) {

      if (window.chrome.storage !== undefined) {
        chrome.storage.local.set({ blockAI: checked });
      }

    }
  };

  const handleStartFocus = () => {
    if (window.chrome !== undefined && window.chrome.runtime !== undefined) {
      chrome.runtime.sendMessage({ action: "START_FOCUS", timers: timers, blockAI: blockAI });

      const maxTime = Math.max(
        Number(timers.difficulty), 
        Number(timers.tags), 
        Number(timers.hints), 
        Number(timers.acceptanceRate)
      );

      chrome.storage.local.get(['totals']).then((result) => {
        let currentTotals = result.totals || { sessions: 0, focusTime: 0, solved: 0, aiBlocked: 0 };

        currentTotals.sessions += 1;

        chrome.storage.local.set({ 
            totals: currentTotals,
            sessionStartTime: Date.now(),
            maxSessionTime: maxTime
        });
      });
    } else {
      console.warn("Please open this as a Chrome Extension to start Focus Mode.");
    }
  };

  const handleEndFocus = () => {
    if (window.chrome !== undefined && window.chrome.runtime !== undefined) {
      chrome.runtime.sendMessage({ action: "END_FOCUS" });

      chrome.storage.local.get(['totals', 'dailyStats', 'sessionStartTime', 'maxSessionTime', 'currentProblemDifficulty']).then((result) => {
        let currentTotals = result.totals || { sessions: 0, focusTime: 0, solved: 0, aiBlocked: 0, difficulty: { Easy: 0, Medium: 0, Hard: 0 } };
        if (!currentTotals.difficulty) {
            currentTotals.difficulty = { Easy: 0, Medium: 0, Hard: 0 };
        }

        let dailyStats = result.dailyStats || {};

        currentTotals.solved += 1;

          let diff = result.currentProblemDifficulty || 'Easy';
        if (currentTotals.difficulty[diff] !== undefined) {
            currentTotals.difficulty[diff] += 1;
        }

        let minutesToAward = 0;
        if (result.sessionStartTime && result.maxSessionTime) {

            let elapsedMinutes = Math.round((Date.now() - result.sessionStartTime) / 60000);

            minutesToAward = Math.min(elapsedMinutes, result.maxSessionTime);
        }

        currentTotals.focusTime += minutesToAward;

        const todayString = new Date().toISOString().split('T')[0];
        if (dailyStats[todayString] === undefined) {
            dailyStats[todayString] = { focusTime: 0, aiBlocked: 0 };
        }
        dailyStats[todayString].focusTime += minutesToAward;

        chrome.storage.local.set({ 
            totals: currentTotals, 
            dailyStats: dailyStats,
            sessionStartTime: null,
            maxSessionTime: null
        });
      });
    }
  };

  const loadDashboard = () => {
    if (window.chrome?.storage) {
      chrome.storage.local.get(['totals', 'dailyStats']).then((result) => {
        if (result.totals) {
          setTotals(result.totals);
        }

        if (result.dailyStats) {
            const formattedData = Object.keys(result.dailyStats).map(dateKey => {
                const shortDate = dateKey.substring(5); 
                return {
                    name: shortDate,
                    focusTime: Number(((result.dailyStats[dateKey].focusTime || 0) / 60).toFixed(1)),
                    aiBlocked: result.dailyStats[dateKey].aiBlocked || 0
                };
            });
            setChartData(formattedData);
        }

        setCurrentView('dashboard'); 
      });
    } else {

        setCurrentView('dashboard');
    }
  };

  return (
    <div className="app-container">
      <div className="logo-container">
        <img src="/logo.png" alt="LeetLock Logo" className="app-logo" />
      </div>

      {currentView === 'settings' ? (
        <>

          <div className="timer-row">
            <span>Difficulty</span>
            <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <input type="number" className="timer-input" value={timers.difficulty} 
                     onChange={(e) => handleTimerChange('difficulty', e.target.value)} />
              <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>min.</span>
            </div>
          </div>

          <div className="timer-row">
            <span>Topic Tags</span>
            <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <input type="number" className="timer-input" value={timers.tags} 
                     onChange={(e) => handleTimerChange('tags', e.target.value)} />
              <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>min.</span>
            </div>
          </div>

          <div className="timer-row">
            <span>Hints</span>
            <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <input type="number" className="timer-input" value={timers.hints} 
                     onChange={(e) => handleTimerChange('hints', e.target.value)} />
              <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>min.</span>
            </div>
          </div>

          <div className="timer-row">
            <span>Acceptance Rate</span>
            <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <input type="number" className="timer-input" value={timers.acceptanceRate} 
                     onChange={(e) => handleTimerChange('acceptanceRate', e.target.value)} />
              <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>min.</span>
            </div>
          </div>

          <div className="timer-row">
            <span>Block AI Tools</span>
            <input type="checkbox" checked={blockAI} 
                   onChange={(e) => handleToggleAI(e.target.checked)} />
          </div>

          <hr />

          <button className="btn btn-primary" onClick={handleStartFocus}><span className="material-symbols-outlined">timer_play</span> Start Focus</button>
          <button className="btn btn-success" onClick={handleEndFocus}><span className="material-symbols-outlined">done_all</span> Mark Solved</button>
          <button className="btn btn-secondary" onClick={loadDashboard}><span className="material-symbols-outlined">bar_chart</span> Analytics Dashboard</button>
        </>
      ) : (
        <div className="dashboard-container">
          <h3>Lifetime Stats</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Sessions</h4>
              <p>{totals.sessions}</p>
            </div>
            <div className="stat-card">
              <h4>Focus Time</h4>
              <p>{(totals.focusTime / 60).toFixed(1)}h</p>
            </div>
            <div className="stat-card">
              <h4>Solved</h4>
              <p>{totals.solved}</p>
            </div>
            <div className="stat-card">
              <h4>AI Blocked</h4>
              <p>{totals.aiBlocked}</p>
            </div>
          </div>

          <h3 style={{marginTop: '25px', marginBottom: '10px'}}>Daily Focus Trend</h3>
          <div style={{ width: '100%', height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--border-color)" fontSize={10} />
                <YAxis tick={false} stroke="var(--border-color)" width={20} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: 'var(--border-color)', fontSize: 10 }} />
                <Tooltip 
                  cursor={{fill: 'var(--bg-primary)'}} 
                  contentStyle={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px'}} 
                />
                <Bar dataKey="focusTime" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3 style={{marginTop: '25px', marginBottom: '10px'}}>AI Cheat Attempts</h3>
          <div style={{ width: '100%', height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--border-color)" fontSize={10} />
                <YAxis tick={false} stroke="var(--border-color)" width={20} label={{ value: 'Attempts', angle: -90, position: 'insideLeft', fill: 'var(--border-color)', fontSize: 10 }} />
                <Tooltip 
                  cursor={{fill: 'var(--bg-primary)'}} 
                  contentStyle={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px'}} 
                />
                <Line type="monotone" dataKey="aiBlocked" stroke="var(--accent-primary)" strokeWidth={3} dot={{ fill: 'var(--accent-secondary)', stroke: 'var(--accent-secondary)', strokeWidth: 2, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <h3 style={{marginTop: '25px', marginBottom: '10px'}}>Difficulty Breakdown</h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[
                    { name: 'Easy', value: totals.difficulty?.Easy || 0 },
                    { name: 'Medium', value: totals.difficulty?.Medium || 0 },
                    { name: 'Hard', value: totals.difficulty?.Hard || 0 }
                  ]} 
                  dataKey="value" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={20} 
                  outerRadius={70} 
                  stroke="none"
                >
                  <Cell fill="var(--border-color)" />
                  <Cell fill="var(--accent-primary)" />
                  <Cell fill="var(--accent-secondary)" />
                </Pie>
                <Tooltip 
                  contentStyle={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px'}} 
                  itemStyle={{color: 'var(--text-primary)'}}
                />
                <Legend verticalAlign="bottom" height={35} wrapperStyle={{ paddingTop: '15px', fontSize: '10px', color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <button className="btn btn-secondary" onClick={() => setCurrentView('settings')} style={{marginTop: '15px'}}>Back to Settings</button>
        </div>
      )}
    </div>
  );
}

export default App;
