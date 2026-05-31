import { useEffect, useMemo, useRef, useState } from 'react';
import { animated, useSpring } from 'react-spring';
import { BookOpen, Plus } from 'lucide-react';
import Sheet from '../components/Sheet';
import { useRules } from '../hooks/useRules';

const RULES_PER_PAGE = 2;

function romanNumeral(value) {
  const numerals = [
    ['M', 1000],
    ['CM', 900],
    ['D', 500],
    ['CD', 400],
    ['C', 100],
    ['XC', 90],
    ['L', 50],
    ['XL', 40],
    ['X', 10],
    ['IX', 9],
    ['V', 5],
    ['IV', 4],
    ['I', 1],
  ];
  let remaining = value;
  let result = '';
  numerals.forEach(([symbol, amount]) => {
    while (remaining >= amount) {
      result += symbol;
      remaining -= amount;
    }
  });
  return result;
}

function playPageTurnSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const buffer = context.createBuffer(1, context.sampleRate * 0.26, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * Math.exp(-index / (context.sampleRate * 0.045));
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 760;
    filter.Q.value = 0.55;
    gain.gain.value = 0.08;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start();
    source.onended = () => context.close();
  } catch (error) {
    console.debug('Page sound skipped', error);
  }
}

function Cover({ state, onOpen }) {
  const coverSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(16px) scale(0.96)' },
    to: { opacity: 1, transform: 'translateY(0) scale(1)' },
    config: { tension: 150, friction: 20 },
  });

  const opening = state === 'opening';

  return (
    <section className="rules-cover-stage">
      <div className="inside-cover-flash" aria-hidden="true">
        <p>In the beginning there was Boardwalk...</p>
      </div>
      <animated.button
        type="button"
        className={`rules-cover ${opening ? 'book-cover-opening' : ''}`}
        style={coverSpring}
        onClick={onOpen}
        aria-label="Open The Degenerate Bible"
      >
        <span className="rules-cover-spine" aria-hidden="true" />
        <span className="rules-leather-texture" aria-hidden="true" />
        <span className="rules-cover-border outer" aria-hidden="true" />
        <span className="rules-cover-border inner" aria-hidden="true" />
        {[0, 1, 2, 3].map(index => (
          <span key={index} className={`rules-corner corner-${index}`} aria-hidden="true" />
        ))}

        <span className="rules-cover-title">
          <span className="rules-gold-line" aria-hidden="true" />
          <span className="rules-cover-kicker">The</span>
          <span className="rules-cover-main">Degenerate</span>
          <span className="rules-cover-bible">Bible</span>
          <span className="rules-divider">
            <span />
            <b>✦</b>
            <span />
          </span>
          <span className="rules-cover-edition">Monopoly Edition</span>
          <span className="rules-gold-line" aria-hidden="true" />
        </span>

        <span className="rules-open-hint">tap to open</span>
      </animated.button>
    </section>
  );
}

function RuleBlock({ rule, number, onRequestDelete }) {
  return (
    <article className="rule-block">
      <span className="rule-number">{romanNumeral(number)}</span>
      <h4>{rule.title}</h4>
      <p>{rule.body}</p>
      <div className="annul-rule-row">
        <button type="button" className="annul-rule-button" onClick={() => onRequestDelete(rule)}>
          ✕ Annul this law
        </button>
      </div>
    </article>
  );
}

function ParchmentPage({ pageNumber, totalPages, rules, turning, onRequestDelete }) {
  return (
    <div className={`rules-page-card ${turning ? `turning-${turning}` : ''}`}>
      <div className="rules-paper-grain" aria-hidden="true" />
      <div className="rules-bound-shadow" aria-hidden="true" />

      <div className="rules-page-scroll">
        {pageNumber === 0 && (
          <header className="rules-page-prologue">
            <h2>The Degenerate Bible</h2>
            <h3>Monopoly Edition</h3>
            <p>
              In the beginning, there was the board. And the board was good. And yea, the first
              player did roll the dice and lo, they landed on Income Tax. And it was not good.
            </p>
          </header>
        )}

        <header className="rules-chapter-heading">
          <h2>Chapter {romanNumeral(pageNumber + 1)}</h2>
          <h3>{pageNumber === 0 ? 'The Sacred Laws of the Board' : 'Further Decrees of the Table'}</h3>
        </header>

        {rules.length === 0 ? (
          <div className="rules-empty-page">
            <BookOpen size={32} />
            <p>The ink is drying. Laws shall appear shortly.</p>
          </div>
        ) : (
          rules.map(({ rule, absoluteIndex }) => (
            <RuleBlock
              key={rule.id || `${rule.title}-${absoluteIndex}`}
              rule={rule}
              number={absoluteIndex + 1}
              onRequestDelete={onRequestDelete}
            />
          ))
        )}
      </div>

      <div className="rules-page-number">- {pageNumber + 1} of {totalPages} -</div>
    </div>
  );
}

function DeleteRuleSheet({ rule, deleting, onClose, onConfirm }) {
  return (
    <Sheet open={Boolean(rule)} onClose={onClose} className="rules-add-sheet rules-delete-sheet">
      <div className="rules-sheet-content">
        <h3 className="rules-delete-title">Annul This Law?</h3>
        <p>
          “{rule?.title}” shall be struck from the sacred tome forever. This act cannot be undone.
        </p>
        <div className="rules-delete-actions">
          <button type="button" onClick={onConfirm} disabled={deleting} className="rules-strike-button">
            {deleting ? 'Striking...' : '✦ Strike It From the Record ✦'}
          </button>
          <button type="button" onClick={onClose} disabled={deleting} className="rules-spare-button">
            Spare This Law
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function AddRuleSheet({ open, onClose, onAddRule }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setBody('');
    setSaving(false);
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim() || saving) return;
    setSaving(true);
    try {
      await onAddRule(title.trim(), body.trim());
      onClose();
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} className="rules-add-sheet">
      <div className="rules-sheet-content">
        <h3>Inscribe a New Law</h3>
        <p>Speak your decree. It shall be written in the sacred tome.</p>

        <label className="form-section-label">Law Title</label>
        <input
          type="text"
          placeholder="e.g. The Boardwalk Pact"
          value={title}
          onChange={event => setTitle(event.target.value)}
          className="control rules-input"
        />

        <label className="form-section-label mt-4">The Decree</label>
        <textarea
          placeholder="Whosoever lands on Boardwalk whilst holding fewer than three properties shall be subject to..."
          value={body}
          onChange={event => setBody(event.target.value)}
          rows={5}
          className="control rules-textarea"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim() || !body.trim() || saving}
          className="rules-inscribe-button"
        >
          {saving ? 'Inscribing...' : '✦ Inscribe This Law ✦'}
        </button>
      </div>
    </Sheet>
  );
}

export default function RulesPage() {
  const { rules, loading, error, addRule, deleteRule } = useRules();
  const [bookState, setBookState] = useState('cover');
  const [currentPage, setCurrentPage] = useState(0);
  const [turning, setTurning] = useState(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [deletingRule, setDeletingRule] = useState(false);
  const touchStartX = useRef(null);
  const turnTimerRef = useRef(null);

  const pages = useMemo(() => {
    const grouped = [];
    for (let index = 0; index < rules.length; index += RULES_PER_PAGE) {
      grouped.push(
        rules.slice(index, index + RULES_PER_PAGE).map((rule, offset) => ({
          rule,
          absoluteIndex: index + offset,
        }))
      );
    }
    return grouped.length > 0 ? grouped : [[]];
  }, [rules]);

  const totalPages = pages.length;
  const pageRules = pages[Math.min(currentPage, totalPages - 1)] || [];

  const pageSpring = useSpring({
    transform: turning === 'next'
      ? 'perspective(1000px) rotateY(-8deg) translateX(-8px)'
      : turning === 'prev'
        ? 'perspective(1000px) rotateY(8deg) translateX(8px)'
        : 'perspective(1000px) rotateY(0deg) translateX(0)',
    opacity: turning ? 0.86 : 1,
    config: { tension: 260, friction: 22 },
  });

  useEffect(() => () => clearTimeout(turnTimerRef.current), []);

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(totalPages - 1, 0));
    }
  }, [currentPage, totalPages]);

  const handleCoverTap = () => {
    if (bookState !== 'cover') return;
    setBookState('opening');
    window.setTimeout(() => setBookState('open'), 820);
  };

  const turnPage = (direction) => {
    if (turning) return;
    if (direction === 'next' && currentPage >= totalPages - 1) return;
    if (direction === 'prev' && currentPage <= 0) return;

    playPageTurnSound();
    setTurning(direction);
    clearTimeout(turnTimerRef.current);
    turnTimerRef.current = window.setTimeout(() => {
      setCurrentPage(page => direction === 'next' ? Math.min(page + 1, totalPages - 1) : Math.max(page - 1, 0));
      setTurning(null);
    }, 340);
  };

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - (event.changedTouches[0]?.clientX ?? touchStartX.current);
    if (Math.abs(diff) > 50) {
      turnPage(diff > 0 ? 'next' : 'prev');
    }
    touchStartX.current = null;
  };

  const closeBook = () => {
    setBookState('cover');
    setCurrentPage(0);
    setTurning(null);
  };

  const handleDeleteRule = async () => {
    if (!ruleToDelete || deletingRule) return;
    setDeletingRule(true);
    try {
      await deleteRule(ruleToDelete.id);
      setRuleToDelete(null);
      if (pageRules.length === 1 && currentPage > 0) {
        setCurrentPage(page => page - 1);
      }
    } catch (deleteError) {
      console.error(deleteError);
    } finally {
      setDeletingRule(false);
    }
  };

  if (bookState !== 'open') {
    return (
      <main className="rules-page rules-cover-mode">
        <Cover state={bookState} onOpen={handleCoverTap} />
      </main>
    );
  }

  return (
    <main className="rules-page rules-open-mode">
      <header className="rules-book-header">
        <button type="button" onClick={closeBook}>← Close</button>
        <span>The Degenerate Bible</span>
        <button type="button" onClick={() => setShowAddRule(true)}>
          <Plus size={14} />
          Add
        </button>
      </header>

      <section
        className="rules-book-stage"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-live="polite"
      >
        {loading && rules.length === 0 ? (
          <div className="rules-loading">Warming the ink...</div>
        ) : error ? (
          <div className="rules-loading">The tome could not be opened. Try again shortly.</div>
        ) : (
          <animated.div style={pageSpring} className="rules-page-shell">
            <ParchmentPage
              key={currentPage}
              pageNumber={currentPage}
              totalPages={totalPages}
              rules={pageRules}
              turning={turning}
              onRequestDelete={setRuleToDelete}
            />
          </animated.div>
        )}
      </section>

      <footer className="rules-book-footer">
        <button type="button" onClick={() => turnPage('prev')} disabled={currentPage === 0}>← Prev</button>
        <span>{currentPage + 1} of {totalPages}</span>
        <button type="button" onClick={() => turnPage('next')} disabled={currentPage === totalPages - 1}>Next →</button>
      </footer>

      <AddRuleSheet open={showAddRule} onClose={() => setShowAddRule(false)} onAddRule={addRule} />
      {ruleToDelete && (
        <DeleteRuleSheet
          rule={ruleToDelete}
          deleting={deletingRule}
          onClose={() => setRuleToDelete(null)}
          onConfirm={handleDeleteRule}
        />
      )}
    </main>
  );
}
