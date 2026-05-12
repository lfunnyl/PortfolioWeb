import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Body + background gradient daha zengin yap
content = content.replace(
    """body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  background-image:
    radial-gradient(ellipse at 20% 10%, rgba(59,130,246,0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.06) 0%, transparent 50%);
}""",
    """body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  background-image:
    radial-gradient(ellipse at 15% 0%, rgba(79,142,247,0.12) 0%, transparent 45%),
    radial-gradient(ellipse at 85% 5%, rgba(139,92,246,0.09) 0%, transparent 40%),
    radial-gradient(ellipse at 50% 100%, rgba(16,217,130,0.05) 0%, transparent 50%);
}"""
)

# Navbar daha yüksek kontrast
content = content.replace(
    """.navbar {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 2.5rem;
  background: rgba(8, 12, 20, 0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
}""",
    """.navbar {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 2rem;
  background: rgba(6, 10, 18, 0.92);
  backdrop-filter: blur(24px) saturate(1.4);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  box-shadow: 0 1px 0 rgba(255,255,255,0.04), var(--shadow-sm);
}"""
)

# Navbar title daha etkileyici
content = content.replace(
    """.navbar-title {
  font-size: 1.2rem; font-weight: 700; letter-spacing: -0.5px;
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}""",
    """.navbar-title {
  font-size: 1.15rem; font-weight: 800; letter-spacing: -0.6px;
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 60%, #f0abfc 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}"""
)

# Navbar right gap azalt
content = content.replace(
    ".navbar-right    { display: flex; align-items: center; gap: 1rem; }",
    ".navbar-right    { display: flex; align-items: center; gap: 0.6rem; }"
)

# Glass card daha premium
content = content.replace(
    """.glass-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 1.5rem;
  backdrop-filter: blur(8px); transition: all var(--transition);
}
.glass-card:hover { background: var(--surface-hover); border-color: rgba(255,255,255,0.12); }""",
    """.glass-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 1.5rem;
  backdrop-filter: blur(12px); transition: all var(--transition);
  box-shadow: var(--shadow-sm);
}
.glass-card:hover { background: var(--surface-hover); border-color: var(--border-bright); box-shadow: var(--shadow-md); }"""
)

# Summary grid daha geniş kartlar
content = content.replace(
    ".summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }",
    ".summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; }"
)

# Summary label daha okunaklı
content = content.replace(
    """.summary-label {
  font-size: 0.78rem; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted);
}""",
    """.summary-label {
  font-size: 0.72rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);
  margin-bottom: 0.15rem;
}"""
)

# Summary value büyük
content = content.replace(
    ".summary-value          { font-size: 1.6rem; font-weight: 700; letter-spacing: -0.5px; }",
    ".summary-value          { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.8px; line-height: 1.1; }"
)

# Tab bar yeni tasarım
content = content.replace(
    """.tabs-bar {
  display: flex; gap: 0.5rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0;
}
.tab-btn {
  display: flex; align-items: center; gap: 0.5rem;
  background: none; border: none; color: var(--text-muted);
  font-size: 0.9rem; font-weight: 500; font-family: inherit;
  padding: 0.7rem 1.2rem; cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: all var(--transition); border-radius: var(--radius) var(--radius) 0 0;
}
.tab-btn:hover { color: var(--text); background: var(--surface-hover); }
.tab-active {
  color: var(--primary) !important;
  border-bottom-color: var(--primary) !important;
  background: rgba(59,130,246,0.05) !important;
}""",
    """.tabs-bar {
  display: flex; gap: 0.25rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0;
}
.tab-btn {
  display: flex; align-items: center; gap: 0.4rem;
  background: none; border: none; color: var(--text-muted);
  font-size: 0.83rem; font-weight: 500; font-family: inherit;
  padding: 0.65rem 1rem; cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: all var(--transition); border-radius: 10px 10px 0 0;
  white-space: nowrap;
}
.tab-btn:hover { color: var(--text-dim); background: rgba(255,255,255,0.04); }
.tab-active {
  color: var(--primary) !important;
  border-bottom-color: var(--primary) !important;
  background: rgba(79,142,247,0.07) !important;
  font-weight: 600 !important;
}"""
)

# Tab badge daha şık
content = content.replace(
    """.tab-badge {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; padding: 0.1rem 0.55rem;
  font-size: 0.72rem; font-weight: 600; color: var(--text-muted);
}
.tab-active .tab-badge { background: var(--primary-glow); border-color: var(--primary); color: var(--primary); }""",
    """.tab-badge {
  background: rgba(255,255,255,0.06); border: 1px solid var(--border);
  border-radius: 20px; padding: 0.08rem 0.5rem;
  font-size: 0.68rem; font-weight: 700; color: var(--text-muted);
  min-width: 20px; text-align: center;
}
.tab-active .tab-badge { background: rgba(79,142,247,0.2); border-color: rgba(79,142,247,0.5); color: var(--primary); }"""
)

# btn-primary modern gradient
content = content.replace(
    """.btn-add {
  align-self: flex-start;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #fff; border: none; border-radius: var(--radius);
  padding: 0.65rem 1.4rem; font-size: 0.9rem; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 20px rgba(59,130,246,0.3); transition: all var(--transition);
}
.btn-add:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(59,130,246,0.4); }""",
    """.btn-add {
  align-self: flex-start;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: #fff; border: none; border-radius: var(--radius);
  padding: 0.65rem 1.5rem; font-size: 0.88rem; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 20px rgba(79,142,247,0.3); transition: all var(--transition);
  letter-spacing: 0.01em;
}
.btn-add:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(79,142,247,0.45); filter: brightness(1.08); }"""
)

# btn-submit renk yenile
content = content.replace(
    """.btn-submit {
  width: 100%; margin-top: 0.5rem;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #fff; border: none; border-radius: var(--radius);
  padding: 0.75rem; font-size: 0.95rem; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all var(--transition);
  box-shadow: 0 4px 16px rgba(59,130,246,0.25);
}
.btn-submit:hover { box-shadow: 0 6px 24px rgba(59,130,246,0.4); transform: translateY(-1px); }""",
    """.btn-submit {
  width: 100%; margin-top: 0.75rem;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: #fff; border: none; border-radius: var(--radius);
  padding: 0.8rem; font-size: 0.95rem; font-weight: 700; font-family: inherit;
  cursor: pointer; transition: all var(--transition);
  box-shadow: 0 4px 20px rgba(79,142,247,0.25);
  letter-spacing: 0.02em;
}
.btn-submit:hover { box-shadow: 0 8px 28px rgba(79,142,247,0.4); transform: translateY(-2px); filter: brightness(1.06); }"""
)

# Asset table daha zarif
content = content.replace(
    ".asset-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }",
    ".asset-table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }"
)
content = content.replace(
    """.asset-table th {
  padding: 0.8rem 1rem; text-align: left;
  font-size: 0.72rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); white-space: nowrap;
}""",
    """.asset-table th {
  padding: 0.9rem 1rem; text-align: left;
  font-size: 0.68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); white-space: nowrap;
}"""
)

# Form input focus daha belirgin
content = content.replace(
    """.form-group input:focus,
.form-group select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); }""",
    """.form-group input:focus,
.form-group select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79,142,247,0.18); outline: none; }"""
)

# Profit/loss kartları glow efekti
content = content.replace(
    ".profit-card { border-color: rgba(34,197,94,0.2); }",
    ".profit-card { border-color: rgba(16,217,130,0.25); box-shadow: 0 0 20px rgba(16,217,130,0.06) !important; }"
)
content = content.replace(
    ".loss-card   { border-color: rgba(239,68,68,0.2); }",
    ".loss-card   { border-color: rgba(245,73,90,0.25); box-shadow: 0 0 20px rgba(245,73,90,0.06) !important; }"
)
content = content.replace(
    ".profit      { color: var(--profit) !important; }",
    ".profit      { color: var(--profit) !important; text-shadow: 0 0 20px rgba(16,217,130,0.3); }"
)

# Main content gap ayarı
content = content.replace(
    """  max-width: 1400px; width: 100%; margin: 0 auto;
  padding: 2rem 2.5rem 4rem;
  display: flex; flex-direction: column; gap: 2rem;""",
    """  max-width: 1440px; width: 100%; margin: 0 auto;
  padding: 1.75rem 2rem 4rem;
  display: flex; flex-direction: column; gap: 1.5rem;"""
)

# Asset icon daha yuvarlak
content = content.replace(
    """.asset-icon {
  font-size: 1.3rem; width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-2); border-radius: 10px; border: 1px solid var(--border); flex-shrink: 0;
}""",
    """.asset-icon {
  font-size: 1.2rem; width: 38px; height: 38px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-3); border-radius: 12px; border: 1px solid var(--border); flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
}"""
)

# Error banner
content = content.replace(
    """.error-banner {
  background: var(--loss-bg); border: 1px solid rgba(239,68,68,0.3);
  border-radius: var(--radius); padding: 0.8rem 1.2rem;
  font-size: 0.88rem; color: #fca5a5;
}""",
    """.error-banner {
  background: rgba(245,73,90,0.08); border: 1px solid rgba(245,73,90,0.25);
  border-radius: var(--radius); padding: 0.85rem 1.25rem;
  font-size: 0.88rem; color: #fda4af;
  display: flex; align-items: center; gap: 0.5rem;
}"""
)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)

print('CSS UI/UX updates applied.')
