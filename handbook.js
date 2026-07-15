(() => {
  const PDF = 'https://dld.utah.gov/wp-content/uploads/Driver-Handbook-REV-3.2026.pdf';
  const PAGES = window.UTAH_HANDBOOK_PAGES || {};
  const CHAPTER_PAGES = {
    'Permit & licensing': [14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36],
    'Vehicle safety': [37,38,39,99,100],
    'Driving fundamentals': [40,41,42,43,44,45,46,47,48],
    'Rules of the road': [49,50,51,52,53,54,55,56,57,58,59,60],
    'Signs & signals': [53,54,55,56,57,58,59,60],
    'School & rail': [95,96,97,98],
    'Sharing the road': [83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98],
    'Impairment & safety': [61,62,63,64,65,66],
    'Emergencies & conditions': [65,66,67,68,69,70,71,72,73,74,75,76],
    'Crashes & responsibility': [74,75,76,77,78,79,80,81,82]
  };
  const FALLBACK = {
    'Permit & licensing': [16,17],
    'Vehicle safety': [37,38],
    'Driving fundamentals': [40,41],
    'Rules of the road': [49,50],
    'Signs & signals': [55,56],
    'School & rail': [95,96],
    'Sharing the road': [83,84],
    'Impairment & safety': [61,62],
    'Emergencies & conditions': [65,66],
    'Crashes & responsibility': [74,75]
  };
  const ALIASES = {
    'Practice driving': ['40 hours of driving', 'practice driving'],
    'Written knowledge test': ['written knowledge test'],
    'Safety belts': ['safety belt'],
    'Car seats': ['car seats', 'child safety seat'],
    'Lane changes': ['lane changes'],
    'Parking on hills': ['hill parking'],
    'Following distance': ['following distance'],
    'Four-way stops': ['four-way stop', 'four way stop'],
    'Left turns': ['left turns'],
    'Freeway driving': ['freeway', 'multi-lane highway'],
    'Pavement markings': ['pavement markings'],
    'Traffic signals': ['traffic signals'],
    'School buses': ['school buses', 'school bus'],
    'Railroad crossings': ['railroad crossings', 'railroad crossing'],
    'Emergency vehicles': ['emergency vehicle'],
    'Large trucks': ['large vehicles', 'large truck', 'tractor-trailer'],
    'Handheld wireless communication': ['handheld wireless communication', 'wireless communication device'],
    'Mountain driving': ['mountain driving'],
    'Financial responsibility': ['financial responsibility'],
    'Address change': ['address change'],
    'Driver education': ['driver education'],
    'Air bags': ['air bags', 'airbag'],
    'Uncontrolled intersections': ['uncontrolled intersection'],
    'Warning signs': ['warning signs'],
    'School zones': ['school zone'],
    'Move Over law': ['move over law', 'move over'],
    'Motorcycles': ['motorcycles', 'motorcycle'],
    'Brake failure': ['brake failure'],
    'Defensive driving': ['defensive driving'],
    'Lane-control signals': ['lane-control signals', 'lane control signals'],
    'Right-of-way': ['right-of-way', 'right of way'],
    'Stop signs': ['stop signs', 'stop sign'],
    'Regulatory signs': ['regulatory signs'],
    'Work zones': ['work zone'],
    'Night driving': ['night driving'],
    'Slow-moving vehicles': ['slow-moving vehicles', 'slow moving vehicles'],
    'Driver record': ['driver record'],
    'Driver license types': ['license types', 'class d driver license'],
    'Vehicle inspection': ['vehicle inspection'],
    'Motor-assisted scooters': ['motor-assisted scooter'],
    'Required documents': ['required documentation'],
    'Vision test': ['vision test'],
    'Turn signals': ['use of turn signals', 'turn signals'],
    'Lane position': ['proper lane usage'],
    'Wet roads': ['wet roads'],
    'Traffic control': ['traffic control'],
    'Road test': ['driving skills test'],
    'Emergency stopping': ['emergency stopping'],
    'Yielding': ['yield right-of-way', 'yield the right-of-way']
  };

  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const topicFrom = (question) => question.source.split('·').pop().trim();
  const normal = (value) => String(value).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  function currentQuestion() {
    if (window.ACTIVE_STUDY_QUESTION) return window.ACTIVE_STUDY_QUESTION;
    const heading = document.querySelector('.question h1');
    return heading && window.REVIEWED_QUESTIONS.find((question) => question.question === heading.textContent);
  }

  function findQuestion(id) {
    if (window.ACTIVE_STUDY_QUESTION && window.ACTIVE_STUDY_QUESTION.id === id) return window.ACTIVE_STUDY_QUESTION;
    return [
      ...(window.REVIEWED_QUESTIONS || []),
      ...(window.HAZARD_SCENARIOS || []),
      ...(window.VISUAL_LESSONS || [])
    ].find((question) => question.id === id);
  }

  function addHandbookLink() {
    const question = currentQuestion();
    if (!question || document.querySelector('[data-handbook]')) return;
    const target = document.querySelector('.question .feedback') || document.querySelector('.question .options');
    if (!target) return;
    target.insertAdjacentHTML('beforebegin', '<button class="handbook-link" data-handbook="' + esc(question.id) + '" aria-haspopup="dialog">Read handbook section</button>');
  }

  function pagesFor(question) {
    const topic = topicFrom(question);
    const candidates = CHAPTER_PAGES[question.category] || [];
    const terms = (ALIASES[topic] || [topic]).map(normal).filter(Boolean);
    const matches = candidates.filter((page) => {
      const text = normal(PAGES[page] || '');
      return terms.some((term) => text.includes(term));
    });
    return [...new Set((matches.length ? matches : FALLBACK[question.category] || []).slice(0, 3))];
  }

  function pageLabel(page) {
    const text = PAGES[page] || '';
    const match = text.match(/(?:^|\n)(\d{1,3})\s*(?:\n|$)/);
    return match ? 'Handbook page ' + match[1] : 'Handbook page';
  }

  let priorFocus = null;
  function openHandbook(id) {
    const question = findQuestion(id);
    if (!question) return;
    const pages = pagesFor(question);
    priorFocus = document.activeElement;
    const topic = topicFrom(question);
    const contents = pages.map((page) => '<article class="handbook-page"><h3>' + esc(pageLabel(page)) + '</h3><div>' + esc(PAGES[page] || 'The text for this page is unavailable. Please use the official handbook link below.').replace(/\n/g, '<br>') + '</div></article>').join('');
    const modal = document.createElement('div');
    modal.className = 'handbook-modal';
    modal.id = 'handbookModal';
    modal.innerHTML = '<div class="handbook-backdrop" data-close></div><section class="handbook-dialog" role="dialog" aria-modal="true" aria-labelledby="handbookTitle" aria-describedby="handbookIntro"><button class="handbook-close" data-close aria-label="Close handbook section">×</button><div class="eyebrow">Official Utah Driver Handbook · REV 3.2026</div><h2 id="handbookTitle">' + esc(topic) + '</h2><p id="handbookIntro" class="muted">The complete official handbook page' + (pages.length === 1 ? '' : 's') + ' most relevant to this question—available here without leaving your practice session.</p><div class="handbook-rule"><b>Why this matters for this question</b><br>' + esc(question.explanation) + '</div><div class="handbook-reading" aria-label="Official handbook text">' + contents + '</div><p class="handbook-note">Text is extracted from the official Utah Driver Handbook. Diagrams and original page layout remain in the PDF; the handbook is the controlling source if content changes.</p><a class="handbook-original" href="' + PDF + '#page=' + (pages[0] || 1) + '" target="_blank" rel="noopener">View original PDF layout</a></section>';
    document.body.appendChild(modal);
    modal.querySelector('.handbook-close').focus();
  }

  function closeHandbook() {
    const modal = document.getElementById('handbookModal');
    if (!modal) return;
    modal.remove();
    priorFocus?.focus();
  }

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-handbook]');
    if (opener) openHandbook(opener.dataset.handbook);
    if (event.target.closest('[data-close]')) closeHandbook();
  });
  document.addEventListener('keydown', (event) => {
    const modal = document.getElementById('handbookModal');
    if (!modal) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeHandbook();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button, a[href]')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  new MutationObserver(addHandbookLink).observe(document.getElementById('app'), { childList: true, subtree: true });
  document.head.insertAdjacentHTML('beforeend', '<style>.handbook-link{margin:12px 0 0;border:0;background:transparent;color:var(--blue);font-weight:800;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:3px}.handbook-link:focus-visible,.handbook-close:focus-visible,.handbook-original:focus-visible{outline:3px solid #edb51b;outline-offset:3px}.handbook-modal{position:fixed;inset:0;z-index:10;display:grid;place-items:center;padding:18px}.handbook-backdrop{position:absolute;inset:0;background:#081a2dcc}.handbook-dialog{position:relative;z-index:1;max-width:680px;width:100%;max-height:90vh;overflow:auto;background:#fff;color:#112840;border-radius:20px;padding:25px;box-shadow:0 18px 70px #0005}.handbook-dialog h2{margin:7px 34px 12px 0;font-size:24px}.handbook-close{position:absolute;right:14px;top:12px;border:0;background:#edf2f7;border-radius:10px;font-size:24px;line-height:1;padding:6px 10px;cursor:pointer}.handbook-rule{background:#edf4ff;border-radius:12px;padding:14px;margin:15px 0;line-height:1.5}.handbook-reading{border-top:1px solid #d9e2ec}.handbook-page{padding:17px 0;border-bottom:1px solid #d9e2ec;line-height:1.55}.handbook-page h3{font-size:15px;margin:0 0 9px;color:#35516c}.handbook-page div{font-size:14px}.handbook-note{font-size:13px;line-height:1.45;margin:16px 0 10px;color:#536b82}.handbook-original{color:var(--blue);font-weight:800}@media(max-width:500px){.handbook-dialog{padding:21px;border-radius:16px}.handbook-modal{padding:10px}.handbook-page div{font-size:13px}}</style>');
  addHandbookLink();
})();
