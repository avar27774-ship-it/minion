import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { api, useStore } from '../store'

// ──────────────────────────────────────────────────────────────────────────────
// GAME: 2048
// ──────────────────────────────────────────────────────────────────────────────
function Game2048() {
  const SIZE = 4
  const empty = () => Array(SIZE).fill(null).map(() => Array(SIZE).fill(0))

  const addRandom = (grid) => {
    const empties = []
    grid.forEach((row, r) => row.forEach((val, c) => { if (!val) empties.push([r, c]) }))
    if (!empties.length) return grid
    const [r, c] = empties[Math.floor(Math.random() * empties.length)]
    const next = grid.map(row => [...row])
    next[r][c] = Math.random() < 0.9 ? 2 : 4
    return next
  }

  const init = () => {
    let g = empty()
    g = addRandom(g)
    g = addRandom(g)
    return g
  }

  const [grid, setGrid] = useState(init)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => Number(localStorage.getItem('mn_2048_best') || 0))
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)

  const slideRow = (row) => {
    let filtered = row.filter(v => v)
    let earned = 0
    for (let i = 0; i < filtered.length - 1; i++) {
      if (filtered[i] === filtered[i + 1]) {
        filtered[i] *= 2
        earned += filtered[i]
        filtered[i + 1] = 0
      }
    }
    filtered = filtered.filter(v => v)
    while (filtered.length < SIZE) filtered.push(0)
    return { row: filtered, earned }
  }

  const move = useCallback((dir) => {
    if (gameOver) return
    let g = grid.map(r => [...r])
    let totalEarned = 0
    let changed = false

    const rotate = (m) => m[0].map((_, i) => m.map(r => r[i]).reverse())
    const rotateCCW = (m) => m[0].map((_, i) => m.map(r => r[r.length - 1 - i]))

    if (dir === 'up')    g = rotateCCW(g)
    if (dir === 'down')  g = rotate(g)
    if (dir === 'right') g = g.map(r => [...r].reverse())

    g = g.map(row => {
      const { row: newRow, earned } = slideRow(row)
      totalEarned += earned
      if (newRow.join() !== row.join()) changed = true
      return newRow
    })

    if (dir === 'up')    g = rotate(g)
    if (dir === 'down')  g = rotateCCW(g)
    if (dir === 'right') g = g.map(r => [...r].reverse())

    if (!changed) return

    g = addRandom(g)
    const newScore = score + totalEarned
    setGrid(g)
    setScore(newScore)
    if (newScore > best) {
      setBest(newScore)
      localStorage.setItem('mn_2048_best', newScore)
    }
    if (g.flat().includes(2048)) setWon(true)

    // Check game over
    const hasMove = () => {
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++) {
          if (!g[r][c]) return true
          if (r < SIZE - 1 && g[r][c] === g[r + 1][c]) return true
          if (c < SIZE - 1 && g[r][c] === g[r][c + 1]) return true
        }
      return false
    }
    if (!hasMove()) setGameOver(true)
  }, [grid, score, best, gameOver])

  useEffect(() => {
    const onKey = (e) => {
      const map = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right' }
      if (map[e.key]) { e.preventDefault(); move(map[e.key]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move])

  // Touch swipe
  const touchStart = useRef(null)
  const onTouchStart = (e) => { touchStart.current = [e.touches[0].clientX, e.touches[0].clientY] }
  const onTouchEnd = (e) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current[0]
    const dy = e.changedTouches[0].clientY - touchStart.current[1]
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left')
    else move(dy > 0 ? 'down' : 'up')
    touchStart.current = null
  }

  const reset = () => { setGrid(init()); setScore(0); setGameOver(false); setWon(false) }

  const tileColor = {
    0: 'rgba(255,255,255,0.04)',
    2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
    32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61',
    512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
  }
  const tileText = (v) => v > 4 ? '#f9f6f2' : '#776e65'

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      <div style={{ display:'flex', gap:10, alignItems:'center', width:'100%', maxWidth:320 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:'var(--t4)', fontWeight:700, letterSpacing:'0.1em' }}>СЧЁТ</div>
          <div style={{ fontSize:22, fontWeight:800, fontFamily:'var(--font-h)', color:'var(--t1)' }}>{score}</div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:'var(--t4)', fontWeight:700, letterSpacing:'0.1em' }}>РЕКОРД</div>
          <div style={{ fontSize:22, fontWeight:800, fontFamily:'var(--font-h)', color:'var(--accent)' }}>{best}</div>
        </div>
        <button onClick={reset} style={{
          padding:'8px 16px', borderRadius:10,
          background:'rgba(245,200,66,0.15)', border:'1px solid rgba(245,200,66,0.3)',
          color:'var(--accent)', fontWeight:700, fontSize:13, cursor:'pointer',
        }}>Заново</button>
      </div>

      <div
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{
          background:'rgba(255,255,255,0.06)', borderRadius:14, padding:8,
          display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8,
          width:'min(320px,90vw)', userSelect:'none',
          position:'relative',
        }}
      >
        {(gameOver || won) && (
          <div style={{
            position:'absolute', inset:0, borderRadius:14,
            background:'rgba(13,13,20,0.88)', backdropFilter:'blur(4px)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            zIndex:10, gap:10,
          }}>
            <div style={{ fontSize:36 }}>{won ? '🏆' : '😢'}</div>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20, color:'var(--t1)' }}>
              {won ? 'Ты выиграл!' : 'Игра окончена'}
            </div>
            <button onClick={reset} className="btn btn-primary btn-sm">Ещё раз</button>
          </div>
        )}
        {grid.flat().map((val, i) => (
          <div key={i} style={{
            width:'100%', aspectRatio:'1',
            background: tileColor[val] || '#3c3a32',
            borderRadius:8,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize: val >= 1000 ? 16 : val >= 100 ? 20 : 26,
            fontWeight:800, fontFamily:'var(--font-h)',
            color: val ? tileText(val) : 'transparent',
            transition:'background 0.1s',
            boxShadow: val >= 2048 ? '0 0 20px rgba(245,200,66,0.6)' : 'none',
          }}>{val || ''}</div>
        ))}
      </div>
      <div style={{ fontSize:12, color:'var(--t4)' }}>Свайп или стрелки для управления • Собери 2048!</div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// GAME: Snake
// ──────────────────────────────────────────────────────────────────────────────
function Snake() {
  const COLS = 20, ROWS = 20
  const CELL = Math.min(Math.floor((Math.min(window.innerWidth - 40, 320)) / COLS), 16)

  const rndFood = (snake) => {
    let f
    do { f = [Math.floor(Math.random()*COLS), Math.floor(Math.random()*ROWS)] }
    while (snake.some(s => s[0]===f[0] && s[1]===f[1]))
    return f
  }

  const [snake, setSnake] = useState([[10,10],[9,10],[8,10]])
  const [dir, setDir] = useState([1,0])
  const [food, setFood] = useState([15,10])
  const [running, setRunning] = useState(false)
  const [dead, setDead] = useState(false)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => Number(localStorage.getItem('mn_snake_best')||0))

  const dirRef = useRef(dir)
  const snakeRef = useRef(snake)
  snakeRef.current = snake

  useEffect(() => { dirRef.current = dir }, [dir])

  const changeDir = useCallback((d) => {
    const cur = dirRef.current
    if (d[0] !== 0 && cur[0] !== 0) return
    if (d[1] !== 0 && cur[1] !== 0) return
    setDir(d)
    dirRef.current = d
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      const map = {
        ArrowUp:[0,-1], ArrowDown:[0,1],
        ArrowLeft:[-1,0], ArrowRight:[1,0],
        w:[0,-1], s:[0,1], a:[-1,0], d:[1,0],
      }
      if (map[e.key]) { e.preventDefault(); changeDir(map[e.key]) }
      if (e.key === ' ') setRunning(r => !r)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [changeDir])

  useEffect(() => {
    if (!running || dead) return
    const tick = () => {
      const s = snakeRef.current
      const d = dirRef.current
      const head = [(s[0][0]+d[0]+COLS)%COLS, (s[0][1]+d[1]+ROWS)%ROWS]
      if (s.some(seg => seg[0]===head[0] && seg[1]===head[1])) {
        setDead(true); setRunning(false)
        return
      }
      setSnake(prev => {
        const ate = food[0]===head[0] && food[1]===head[1]
        const next = [head, ...prev]
        if (!ate) next.pop()
        if (ate) {
          setFood(rndFood(next))
          setScore(sc => {
            const ns = sc + 10
            if (ns > best) { setBest(ns); localStorage.setItem('mn_snake_best', ns) }
            return ns
          })
        }
        return next
      })
    }
    const id = setInterval(tick, 120)
    return () => clearInterval(id)
  }, [running, dead, food, best])

  const reset = () => {
    const s = [[10,10],[9,10],[8,10]]
    setSnake(s); setDir([1,0]); dirRef.current=[1,0]
    setFood(rndFood(s)); setDead(false); setScore(0); setRunning(false)
  }

  // Touch swipe for snake
  const touchStart = useRef(null)
  const onTouchStart = (e) => { touchStart.current=[e.touches[0].clientX,e.touches[0].clientY] }
  const onTouchEnd = (e) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current[0]
    const dy = e.changedTouches[0].clientY - touchStart.current[1]
    if (Math.max(Math.abs(dx),Math.abs(dy)) < 15) { setRunning(r=>!r); return }
    if (Math.abs(dx)>Math.abs(dy)) changeDir(dx>0?[1,0]:[-1,0])
    else changeDir(dy>0?[0,1]:[0,-1])
    touchStart.current=null
  }

  const set = new Set(snake.map(s=>s[0]+','+s[1]))

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      <div style={{ display:'flex', gap:10, alignItems:'center', width:'100%', maxWidth:COLS*CELL+16 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:'var(--t4)', fontWeight:700, letterSpacing:'0.1em' }}>СЧЁТ</div>
          <div style={{ fontSize:22, fontWeight:800, fontFamily:'var(--font-h)', color:'var(--t1)' }}>{score}</div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:'var(--t4)', fontWeight:700, letterSpacing:'0.1em' }}>РЕКОРД</div>
          <div style={{ fontSize:22, fontWeight:800, fontFamily:'var(--font-h)', color:'var(--accent)' }}>{best}</div>
        </div>
        <button onClick={reset} style={{
          padding:'8px 16px', borderRadius:10,
          background:'rgba(245,200,66,0.15)', border:'1px solid rgba(245,200,66,0.3)',
          color:'var(--accent)', fontWeight:700, fontSize:13, cursor:'pointer',
        }}>Заново</button>
      </div>

      <div style={{ position:'relative' }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      >
        <svg width={COLS*CELL} height={ROWS*CELL} style={{ display:'block', borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
          {/* Grid dots */}
          {Array.from({length:COLS}).map((_,x)=>Array.from({length:ROWS}).map((_,y)=>(
            <circle key={x+','+y} cx={x*CELL+CELL/2} cy={y*CELL+CELL/2} r={1} fill="rgba(255,255,255,0.05)"/>
          )))}
          {/* Food */}
          <circle cx={food[0]*CELL+CELL/2} cy={food[1]*CELL+CELL/2} r={CELL/2-1} fill="#e8500a" style={{filter:'drop-shadow(0 0 4px #e8500a)'}}/>
          {/* Snake */}
          {snake.map(([x,y],i)=>(
            <rect key={i} x={x*CELL+1} y={y*CELL+1} width={CELL-2} height={CELL-2} rx={3}
              fill={i===0?'#f5c842':'rgba(245,200,66,0.7)'}
              style={i===0?{filter:'drop-shadow(0 0 6px rgba(245,200,66,0.5))'}:{}}
            />
          ))}
        </svg>
        {(dead || !running) && (
          <div style={{
            position:'absolute', inset:0, borderRadius:12,
            background:'rgba(13,13,20,0.82)', backdropFilter:'blur(4px)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:10,
          }}>
            {dead
              ? <>
                  <div style={{ fontSize:36 }}>💀</div>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:18, color:'var(--t1)' }}>Игра окончена</div>
                  <div style={{ color:'var(--t3)', fontSize:13 }}>Счёт: {score}</div>
                  <button onClick={reset} className="btn btn-primary btn-sm">Снова</button>
                </>
              : <>
                  <div style={{ fontSize:32 }}>🐍</div>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:16, color:'var(--t2)' }}>Нажми чтобы начать</div>
                  <div style={{ fontSize:12, color:'var(--t4)' }}>Свайп или WASD / стрелки</div>
                  <button onClick={()=>setRunning(true)} className="btn btn-primary btn-sm">Старт</button>
                </>
            }
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,44px)', gridTemplateRows:'repeat(2,44px)', gap:6 }}>
        {[
          [null, {label:'↑', d:[0,-1]}, null],
          [{label:'←', d:[-1,0]}, {label:'↓', d:[0,1]}, {label:'→', d:[1,0]}],
        ].flat().map((btn, i) => btn ? (
          <button key={i} onTouchStart={e=>{e.preventDefault();changeDir(btn.d);if(!running&&!dead)setRunning(true)}} onClick={()=>{changeDir(btn.d);if(!running&&!dead)setRunning(true)}}
            style={{ width:44, height:44, borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', color:'var(--t2)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {btn.label}
          </button>
        ) : <div key={i}/>)}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// GAME: Tic-Tac-Toe
// ──────────────────────────────────────────────────────────────────────────────
function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [xTurn, setXTurn] = useState(true)
  const [winner, setWinner] = useState(null) // 'X','O','draw'
  const [scores, setScores] = useState({X:0,O:0,draw:0})
  const [winLine, setWinLine] = useState(null)
  const [vsAI, setVsAI] = useState(true)

  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]

  const checkWinner = (b) => {
    for (const [a,bb,c] of lines)
      if (b[a] && b[a]===b[bb] && b[a]===b[c]) return { winner: b[a], line:[a,bb,c] }
    if (b.every(v=>v)) return { winner:'draw', line:null }
    return null
  }

  const minimax = (b, isMax) => {
    const res = checkWinner(b)
    if (res) return res.winner==='O'?10:res.winner==='X'?-10:0
    const scores = []
    b.forEach((v,i) => {
      if (v) return
      const nb = [...b]; nb[i]=isMax?'O':'X'
      scores.push(minimax(nb,!isMax))
    })
    return isMax ? Math.max(...scores) : Math.min(...scores)
  }

  const aiMove = (b) => {
    let best=-Infinity, idx=null
    b.forEach((v,i)=>{
      if (v) return
      const nb=[...b]; nb[i]='O'
      const s=minimax(nb,false)
      if(s>best){best=s;idx=i}
    })
    return idx
  }

  const play = (i) => {
    if (board[i] || winner) return
    if (vsAI && !xTurn) return
    const nb = [...board]; nb[i] = xTurn ? 'X' : 'O'
    const res = checkWinner(nb)
    setBoard(nb)
    if (res) {
      setWinner(res.winner)
      setWinLine(res.line)
      setScores(s => ({...s, [res.winner]: s[res.winner]+1}))
    } else {
      setXTurn(!xTurn)
    }
  }

  useEffect(() => {
    if (!vsAI || xTurn || winner) return
    const t = setTimeout(() => {
      const idx = aiMove(board)
      if (idx !== null) {
        const nb = [...board]; nb[idx] = 'O'
        const res = checkWinner(nb)
        setBoard(nb)
        if (res) {
          setWinner(res.winner)
          setWinLine(res.line)
          setScores(s => ({...s, [res.winner]: s[res.winner]+1}))
        } else setXTurn(true)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [xTurn, board, vsAI, winner])

  const reset = () => { setBoard(Array(9).fill(null)); setXTurn(true); setWinner(null); setWinLine(null) }
  const fullReset = () => { reset(); setScores({X:0,O:0,draw:0}) }

  const symbols = { X:'✕', O:'○' }
  const colors = { X:'#f5c842', O:'#8b5cf6' }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
      {/* Mode toggle */}
      <div style={{ display:'flex', gap:6, background:'rgba(255,255,255,0.05)', padding:4, borderRadius:10 }}>
        {[{l:'vs ИИ', v:true},{l:'vs Друг', v:false}].map(m=>(
          <button key={m.l} onClick={()=>{setVsAI(m.v);fullReset()}} style={{
            padding:'6px 16px', borderRadius:8, fontSize:13, fontWeight:600,
            background:vsAI===m.v?'rgba(245,200,66,0.2)':'transparent',
            border:vsAI===m.v?'1px solid rgba(245,200,66,0.4)':'1px solid transparent',
            color:vsAI===m.v?'var(--accent)':'var(--t3)', cursor:'pointer',
          }}>{m.l}</button>
        ))}
      </div>

      {/* Scores */}
      <div style={{ display:'flex', gap:12, width:'100%', maxWidth:280 }}>
        {[['X','Ты'],['draw','Ничья'],['O',vsAI?'ИИ':'Друг']].map(([k,label])=>(
          <div key={k} style={{ flex:1, textAlign:'center', padding:'8px 4px', borderRadius:10, background:`rgba(${k==='X'?'245,200,66':k==='O'?'139,92,246':'255,255,255'},0.06)`, border:`1px solid rgba(${k==='X'?'245,200,66':k==='O'?'139,92,246':'255,255,255'},0.12)` }}>
            <div style={{ fontSize:11, color:'var(--t4)', marginBottom:2 }}>{label}</div>
            <div style={{ fontSize:22, fontWeight:800, fontFamily:'var(--font-h)', color:k==='draw'?'var(--t3)':colors[k] }}>{scores[k]}</div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{ fontSize:14, color:'var(--t2)', fontWeight:600, height:20 }}>
        {winner
          ? winner==='draw' ? '🤝 Ничья!' : `🏆 Победил ${winner==='X'?'Ты':vsAI?'ИИ':'Друг'}!`
          : `Ход: ${xTurn?'Ты (✕)':vsAI?'ИИ (○)':'Друг (○)'}`
        }
      </div>

      {/* Board */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, width:240 }}>
        {board.map((val,i)=>{
          const isWin = winLine?.includes(i)
          return (
            <button key={i} onClick={()=>play(i)} style={{
              width:72, height:72, borderRadius:12,
              background: isWin ? `rgba(${val==='X'?'245,200,66':'139,92,246'},0.25)` : val ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
              border: `2px solid ${isWin?colors[val]:val?`rgba(${val==='X'?'245,200,66':'139,92,246'},0.3)`:'rgba(255,255,255,0.1)'}`,
              cursor: val||winner?'default':'pointer',
              fontSize:30, fontWeight:900, color:val?colors[val]:'transparent',
              transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: isWin?`0 0 16px rgba(${val==='X'?'245,200,66':'139,92,246'},0.4)`:'none',
            }}>
              {val ? symbols[val] : ''}
            </button>
          )
        })}
      </div>

      {winner && (
        <button onClick={reset} className="btn btn-primary btn-sm">Ещё партию</button>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// GAME: Bottle (Spin the bottle)
// ──────────────────────────────────────────────────────────────────────────────

// Realistic avatar initials
const DEMO_PLAYERS = [
  { id:'d1', username:'Дарья',     avatar:null, color:'#e8500a' },
  { id:'d2', username:'Петр',      avatar:null, color:'#8b5cf6' },
  { id:'d3', username:'Аленка',    avatar:null, color:'#10b981' },
  { id:'d4', username:'Александр', avatar:null, color:'#f59e0b' },
  { id:'d5', username:'Ольга',     avatar:null, color:'#ec4899' },
  { id:'d6', username:'Катя',      avatar:null, color:'#06b6d4' },
  { id:'d7', username:'Сергей',    avatar:null, color:'#84cc16' },
  { id:'d8', username:'Анечка',    avatar:null, color:'#f43f5e' },
  { id:'d9', username:'Евгений',   avatar:null, color:'#a855f7' },
  { id:'d10', username:'Маргарита',avatar:null, color:'#fb923c' },
]

function BottleGame() {
  const { user } = useStore()
  const [players, setPlayers]     = useState(DEMO_PLAYERS)
  const [spinning, setSpinning]   = useState(false)
  const [angle, setAngle]         = useState(0)
  const [target, setTarget]       = useState(null)
  const [history, setHistory]     = useState([])
  const [customName, setCustomName] = useState('')
  const [loaded, setLoaded]       = useState(false)

  // Try to load real users from catalog sellers
  useEffect(() => {
    api.get('/products?limit=40').then(r => {
      const prods = r.data?.products || r.data || []
      const seen = new Set()
      const real = []
      prods.forEach(p => {
        const s = p.seller
        if (!s) return
        const id = String(s.id || s._id || '')
        const name = s.username || s.firstName || ''
        if (!id || !name || seen.has(id)) return
        seen.add(id)
        const colors = ['#e8500a','#8b5cf6','#10b981','#f59e0b','#ec4899','#06b6d4','#84cc16','#f43f5e','#a855f7','#fb923c']
        real.push({ id, username: name, avatar: s.avatar || null, color: colors[real.length % colors.length] })
      })
      if (real.length >= 4) {
        // Keep up to 10, add current user at top
        const list = real.slice(0, 10)
        if (user && !list.find(p => p.id === String(user.id))) {
          list.unshift({ id: String(user.id), username: user.username || 'Ты', avatar: user.avatar || null, color: '#f5c842', isMe: true })
          if (list.length > 10) list.pop()
        }
        setPlayers(list)
      } else if (user) {
        setPlayers(prev => {
          const copy = [...prev]
          if (!copy.find(p => p.isMe)) {
            copy[0] = { id: String(user.id), username: user.username || 'Ты', avatar: null, color: '#f5c842', isMe: true }
          }
          return copy
        })
      }
      setLoaded(true)
    }).catch(() => {
      if (user) {
        setPlayers(prev => {
          const copy = [...prev]
          copy[0] = { id: String(user.id), username: user.username || 'Ты', avatar: null, color: '#f5c842', isMe: true }
          return copy
        })
      }
      setLoaded(true)
    })
  }, [user])

  const addPlayer = () => {
    const name = customName.trim()
    if (!name || players.length >= 12) return
    const colors = ['#e8500a','#8b5cf6','#10b981','#f59e0b','#ec4899','#06b6d4']
    setPlayers(prev => [...prev, { id: 'c_'+Date.now(), username: name, avatar: null, color: colors[prev.length % colors.length] }])
    setCustomName('')
  }

  const removePlayer = (id) => {
    if (players.length <= 2) return
    setPlayers(prev => prev.filter(p => p.id !== id))
  }

  const spin = () => {
    if (spinning || players.length < 2) return
    setSpinning(true)
    setTarget(null)

    const targetIdx  = Math.floor(Math.random() * players.length)
    // angle per player segment
    const segAngle   = 360 / players.length
    // place players starting at top (−90°), going clockwise
    // player at index i is at: -90 + i * segAngle  degrees
    const playerDeg  = -90 + targetIdx * segAngle
    // bottle tip points at 0° (right), we want tip → player
    // extra spins for drama
    const spins      = 1440 + Math.random() * 720   // 4-6 full rotations
    const finalAngle = angle + spins + (playerDeg - (angle % 360) + 360) % 360

    setAngle(finalAngle)

    setTimeout(() => {
      setSpinning(false)
      setTarget(players[targetIdx])
      setHistory(h => [{ spinner: players.find(p=>p.isMe) || players[0], kissee: players[targetIdx], ts: Date.now() }, ...h.slice(0,9)])
    }, 3200)
  }

  const N = players.length
  // Layout: players arranged in a circle
  // We use SVG-based layout calculated in CSS
  const RADIUS = 110 // px from center to avatar center (in 300×300 space)
  const CENTER = 150

  const playerPositions = useMemo(() => players.map((p, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2
    return {
      ...p,
      x: CENTER + RADIUS * Math.cos(a),
      y: CENTER + RADIUS * Math.sin(a),
    }
  }), [players, N])

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>

      {/* Wood-texture arena */}
      <div style={{
        width: 300, height: 300, borderRadius: '50%', position:'relative', flexShrink:0,
        background: 'radial-gradient(ellipse at 40% 30%, #d4924a 0%, #b8732a 40%, #8b5520 100%)',
        boxShadow: '0 0 0 6px rgba(139,85,32,0.5), 0 12px 40px rgba(0,0,0,0.6)',
        overflow:'visible',
      }}>
        {/* Wood grain lines */}
        <svg style={{position:'absolute',inset:0,borderRadius:'50%',overflow:'hidden'}} width={300} height={300}>
          <defs>
            <radialGradient id="wood" cx="40%" cy="30%">
              <stop offset="0%"   stopColor="#d4924a"/>
              <stop offset="60%"  stopColor="#b8732a"/>
              <stop offset="100%" stopColor="#7a4515"/>
            </radialGradient>
          </defs>
          <circle cx={150} cy={150} r={150} fill="url(#wood)"/>
          {[0,1,2,3,4,5].map(i=>(
            <ellipse key={i} cx={150} cy={150} rx={30+i*22} ry={18+i*13}
              fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={1.5}
              transform={`rotate(${i*8} 150 150)`}/>
          ))}
          {/* Center shadow */}
          <circle cx={150} cy={150} r={55} fill="rgba(0,0,0,0.12)"/>
        </svg>

        {/* Player avatars */}
        {playerPositions.map((p, i) => (
          <div key={p.id} style={{
            position:'absolute',
            left: p.x - 30, top: p.y - 30,
            width: 60, height: 60,
            display:'flex', flexDirection:'column', alignItems:'center', gap:2,
            zIndex: 10,
          }}>
            <div
              onClick={() => !p.isMe && removePlayer(p.id)}
              style={{
                width:48, height:48, borderRadius:12,
                background: p.color,
                border: `3px solid ${target?.id===p.id?'#fff':p.isMe?'rgba(245,200,66,0.8)':'rgba(0,0,0,0.3)'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:16, fontWeight:800, fontFamily:'var(--font-h)', color:'#fff',
                cursor: p.isMe ? 'default' : 'pointer',
                boxShadow: target?.id===p.id
                  ? '0 0 0 4px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.5)'
                  : '0 3px 10px rgba(0,0,0,0.4)',
                transition:'all 0.3s',
                overflow:'hidden',
                position:'relative',
                animation: target?.id===p.id ? 'pulse 0.5s ease infinite alternate' : 'none',
              }}
            >
              {(p.username || '?')[0].toUpperCase()}
              {!p.isMe && (
                <div style={{
                  position:'absolute', top:0, right:0, width:14, height:14,
                  background:'rgba(0,0,0,0.5)', borderRadius:'0 0 0 6px',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:8, color:'rgba(255,255,255,0.7)',
                }}>✕</div>
              )}
            </div>
            <div style={{
              fontSize:8, fontWeight:700, color:'#fff',
              textShadow:'0 1px 4px rgba(0,0,0,0.8)',
              maxWidth:58, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              textAlign:'center', letterSpacing:'0.02em',
            }}>{p.username}</div>
          </div>
        ))}

        {/* Bottle — SVG rotated */}
        <div style={{
          position:'absolute', left:'50%', top:'50%',
          width:100, height:100,
          marginLeft:-50, marginTop:-50,
          transform: `rotate(${angle}deg)`,
          transition: spinning ? 'transform 3.2s cubic-bezier(0.17,0.67,0.21,0.97)' : 'none',
          zIndex:20, pointerEvents:'none',
        }}>
          <svg viewBox="0 0 100 100" width={100} height={100}>
            {/* bottle pointing right (tip at right) */}
            <g transform="rotate(-90 50 50)">
              {/* neck */}
              <rect x={44} y={8} width={12} height={20} rx={4} fill="#4ade80" opacity={0.9}/>
              {/* body */}
              <ellipse cx={50} cy={50} rx={14} ry={26} fill="#22c55e"/>
              {/* highlight */}
              <ellipse cx={44} cy={38} rx={4} ry={10} fill="rgba(255,255,255,0.25)" transform="rotate(-15 44 38)"/>
              {/* cap */}
              <rect x={46} y={4} width={8} height={8} rx={2} fill="#16a34a"/>
              {/* bottom */}
              <ellipse cx={50} cy={74} rx={13} ry={4} fill="#15803d"/>
            </g>
          </svg>
        </div>

        {/* Spin button center */}
        <button onClick={spin} disabled={spinning} style={{
          position:'absolute', left:'50%', top:'50%',
          width:44, height:44, marginLeft:-22, marginTop:-22,
          borderRadius:'50%', zIndex:30,
          background: spinning ? 'rgba(30,30,50,0.7)' : 'rgba(245,200,66,0.9)',
          border: '3px solid rgba(255,255,255,0.3)',
          cursor: spinning ? 'not-allowed' : 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:20,
          boxShadow: spinning ? 'none' : '0 4px 16px rgba(245,200,66,0.5)',
          transition:'all 0.2s',
        }}>
          {spinning ? '⏳' : '🔄'}
        </button>
      </div>

      {/* Result */}
      {target && !spinning && (
        <div style={{
          padding:'12px 20px', borderRadius:16,
          background:'rgba(245,200,66,0.1)', border:'1px solid rgba(245,200,66,0.35)',
          textAlign:'center', animation:'fadeUp 0.4s ease',
        }}>
          <div style={{ fontSize:24, marginBottom:4 }}>💋</div>
          <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:16, color:'var(--t1)' }}>
            {target.isMe ? 'Тебе повезло!' : `Целует → `}
            <span style={{ color:'var(--accent)' }}>{target.username}</span>
          </div>
        </div>
      )}

      {/* Add player */}
      <div style={{ display:'flex', gap:8, width:'100%', maxWidth:300 }}>
        <input
          value={customName}
          onChange={e=>setCustomName(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&addPlayer()}
          placeholder="Добавить игрока..."
          maxLength={12}
          style={{
            flex:1, padding:'9px 14px', borderRadius:10,
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
            color:'var(--t1)', fontSize:13, outline:'none',
          }}
        />
        <button onClick={addPlayer} disabled={!customName.trim()||players.length>=12} style={{
          padding:'9px 14px', borderRadius:10,
          background:'rgba(245,200,66,0.15)', border:'1px solid rgba(245,200,66,0.3)',
          color:'var(--accent)', fontWeight:700, fontSize:13,
          cursor: customName.trim()&&players.length<12 ? 'pointer':'not-allowed', opacity: customName.trim()&&players.length<12?1:0.5,
        }}>+</button>
      </div>

      <div style={{ fontSize:11, color:'var(--t4)', textAlign:'center' }}>
        {players.length}/12 игроков · Нажми на аватар чтобы удалить · Кликни 🔄 для вращения
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ width:'100%', maxWidth:300 }}>
          <div style={{ fontSize:11, color:'var(--t4)', fontWeight:700, letterSpacing:'0.1em', marginBottom:6 }}>ИСТОРИЯ</div>
          {history.slice(0,3).map((h,i) => (
            <div key={h.ts} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:13, color:'var(--t3)' }}>
              <span style={{ color:'var(--accent)', fontWeight:700 }}>{h.kissee.username}</span>
              <span>получил(а) 💋</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          from { box-shadow: 0 0 0 4px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.5); }
          to   { box-shadow: 0 0 0 8px rgba(255,255,255,0.5), 0 0 30px rgba(255,255,255,0.8); }
        }
      `}</style>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// GAMES PAGE
// ──────────────────────────────────────────────────────────────────────────────
const GAMES = [
  { id:'bottle', label:'Бутылочка',       emoji:'🍾', desc:'Крути бутылку — целуйся!',    component: BottleGame },
  { id:'2048',   label:'2048',           emoji:'🟨', desc:'Складывай числа до 2048',     component: Game2048 },
  { id:'snake',  label:'Змейка',         emoji:'🐍', desc:'Классическая змейка',          component: Snake },
  { id:'ttt',    label:'Крестики-нолики',emoji:'✕○', desc:'Три в ряд vs ИИ или друга',   component: TicTacToe },
]

export default function GamesPage() {
  const [active, setActive] = useState(null)
  const game = GAMES.find(g=>g.id===active)

  return (
    <div style={{ maxWidth:480, margin:'0 auto', padding:'24px 16px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        {active && (
          <button onClick={()=>setActive(null)} style={{
            display:'flex', alignItems:'center', gap:6,
            background:'none', border:'none', color:'var(--t3)',
            fontSize:14, cursor:'pointer', padding:'4px 0', marginBottom:12,
          }}>
            ← Все игры
          </button>
        )}
        <h1 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:26, margin:0, letterSpacing:'-0.02em' }}>
          {active ? game.label : <>Игры <span style={{ color:'var(--accent)' }}>🎮</span></>}
        </h1>
        {!active && <p style={{ color:'var(--t3)', fontSize:14, marginTop:4 }}>Три классические игры прямо в маркетплейсе</p>}
      </div>

      {/* Game list */}
      {!active && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {GAMES.map(g=>(
            <button key={g.id} onClick={()=>setActive(g.id)} style={{
              display:'flex', alignItems:'center', gap:16, padding:'18px 20px',
              borderRadius:16, background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.08)',
              cursor:'pointer', textAlign:'left', width:'100%',
              transition:'all 0.18s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(245,200,66,0.06)';e.currentTarget.style.borderColor='rgba(245,200,66,0.2)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}}
            >
              <div style={{
                width:56, height:56, borderRadius:16, flexShrink:0,
                background:'rgba(245,200,66,0.1)', border:'1px solid rgba(245,200,66,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:26,
              }}>{g.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:16, color:'var(--t1)' }}>{g.label}</div>
                <div style={{ fontSize:13, color:'var(--t3)', marginTop:2 }}>{g.desc}</div>
              </div>
              <div style={{ color:'rgba(255,255,255,0.2)', fontSize:18 }}>›</div>
            </button>
          ))}
        </div>
      )}

      {/* Active game */}
      {active && game && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
          <game.component />
        </div>
      )}
    </div>
  )
}
