(() => {
  const questions = window.REVIEWED_QUESTIONS;
  const lessons = window.VISUAL_LESSONS || [];
  const hazards = window.HAZARD_SCENARIOS || [];
  const key = 'bryson-road-ready-engine-v1';
  const base = { xp: 0, history: {}, sessions: [], missed: [], theme: 'classic', weeklyGoal: 60, activityHistory: {} };
  let state = { ...base, ...load() };
  state.missed = Array.isArray(state.missed) ? state.missed : [];
  state.activityHistory = state.activityHistory || {};
  let run = [];
  let position = 0;
  let answers = [];
  let repaired = 0;
  let answered = false;
  const categories = [...new Set(questions.map((question) => question.category))];
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function load() {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
  }
  function save() { localStorage.setItem(key, JSON.stringify(state)); }
  function categoryStats(category) {
    let attempts = 0, correct = 0;
    questions.filter((question) => question.category === category).forEach((question) => {
      const history = state.history[question.id];
      if (history) { attempts += history.a || 0; correct += history.n || 0; }
    });
    return { attempts, correct, percent: attempts ? Math.round((correct / attempts) * 100) : 0 };
  }
  function isDue(question) {
    const history = state.history[question.id];
    return !history || !history.due || history.due < Date.now();
  }
  function weeklyCount() {
    return state.sessions.filter((session) => session.date > Date.now() - 604800000).reduce((sum, session) => sum + (session.count || 0), 0);
  }
  function achievements() {
    const total = Object.values(state.history).reduce((sum, history) => sum + (history.a || 0), 0);
    const list = [];
    if (total >= 25) list.push('First 25');
    if (total >= 100) list.push('Hundred strong');
    if (weeklyCount() >= state.weeklyGoal) list.push('Weekly goal');
    if (state.missed.filter((item) => item.recovered).length >= 5) list.push('Recovery builder');
    if (categories.some((category) => { const stats = categoryStats(category); return stats.attempts >= 10 && stats.percent >= 90; })) list.push('Topic ace');
    return list;
  }
  function weakestCategory() {
    return categories.slice().sort((left, right) => categoryStats(left).percent - categoryStats(right).percent)[0];
  }
  function strongestCategory() {
    return categories.slice().sort((left, right) => categoryStats(right).percent - categoryStats(left).percent)[0];
  }
  function setTheme() { document.documentElement.dataset.theme = state.theme; }
  function coach() {
    const total = Object.values(state.history).reduce((sum, history) => sum + (history.a || 0), 0);
    if (!total) return 'Start with a short Smart Practice session so I can map what you already know.';
    const open = state.missed.filter((item) => !item.recovered).length;
    if (open) return `${open} concept${open === 1 ? '' : 's'} need repair. Related questions will come first, then the original rule returns later.`;
    return `${strongestCategory()} is your strongest area right now. ${weakestCategory()} is the best place to earn the next meaningful improvement.`;
  }

  function dashboard() {
    window.ACTIVE_STUDY_QUESTION = null;
    setTheme();
    const weekly = weeklyCount();
    const badges = achievements();
    const openMisses = state.missed.filter((item) => !item.recovered).length;
    $('#xp').textContent = state.xp;
    $('#app').innerHTML = `
      <section class="hero">
        <article class="card">
          <div class="eyebrow">Learning plan</div>
          <h1>Understand the rule, then use it.</h1>
          <p class="muted">${openMisses ? `${openMisses} rule${openMisses === 1 ? '' : 's'} are waiting for a structured recovery—not a repeat loop.` : 'Build recognition with visuals, then practice the next decision in a real Utah driving situation.'}</p>
          <div class="row">
            <button class="btn primary" onclick="learningStart('smart')">Smart Practice</button>
            <button class="btn soft" onclick="learningStart('recovery')">Mistake recovery${openMisses ? ` · ${openMisses}` : ''}</button>
            <button class="btn plain" onclick="learningStart('visual')">Visual lessons</button>
            <button class="btn plain" onclick="learningStart('hazard')">Hazard Lab</button>
          </div>
        </article>
        <aside class="card">
          <b>${weekly}/${state.weeklyGoal}</b>
          <p class="muted">weekly question goal</p>
          <div class="bar"><i style="width:${Math.min(100, weekly / state.weeklyGoal * 100)}%"></i></div>
          <p class="muted">${badges.length ? badges.join(' · ') : 'Your first achievement is waiting.'}</p>
        </aside>
      </section>
      <h2>Coach’s notes</h2>
      <article class="card"><b>${coach()}</b><p class="muted">Recommended: ${openMisses ? 'Mistake recovery' : 'Visual lessons, then Smart Practice'}</p></article>
      <h2>Study by topic</h2>
      <section class="topics">${categories.map((category) => {
        const stats = categoryStats(category);
        return `<button class="card topic" onclick="learningStart('topic','${esc(category)}')"><b>${esc(category)}</b><small class="muted">${stats.attempts ? `${stats.percent}% · ${stats.attempts} attempts` : 'New'}</small><div class="bar"><i style="width:${stats.percent}%"></i></div></button>`;
      }).join('')}</section>
      <h2>Theme</h2>
      <div class="row">${['classic', 'night', 'snow'].map((theme) => `<button class="btn ${state.theme === theme ? 'primary' : 'plain'}" onclick="setTheme('${theme}')">${theme}</button>`).join('')}</div>`;
  }

  function smartQuestions(category) {
    const recent = new Set(Object.entries(state.history).filter(([, value]) => value.last && value.last > Date.now() - 86400000).map(([id]) => id));
    const pool = (category ? questions.filter((question) => question.category === category) : questions).slice();
    return pool.sort((left, right) => {
      const score = (question) => {
        const history = state.history[question.id];
        const weak = 100 - categoryStats(question.category).percent;
        return (recent.has(question.id) ? -20 : 0) + (isDue(question) ? 8 : 0) + (history ? (history.a - history.n) * 5 : 7) + weak / 25 + Math.random();
      };
      return score(right) - score(left);
    }).slice(0, 10);
  }
  function relatedQuestions(target, count) {
    return questions.filter((question) => question.category === target.category && question.id !== target.id)
      .sort((left, right) => {
        const leftScore = (left.source === target.source ? 3 : 0) + (isDue(left) ? 2 : 0) + Math.random();
        const rightScore = (right.source === target.source ? 3 : 0) + (isDue(right) ? 2 : 0) + Math.random();
        return rightScore - leftScore;
      }).slice(0, count);
  }
  function recoveryRun() {
    const targets = state.missed.filter((item) => !item.recovered).sort((left, right) => (right.lastMissed || 0) - (left.lastMissed || 0)).slice(0, 3)
      .map((item) => ({ item, question: questions.find((question) => question.id === item.id) })).filter((entry) => entry.question);
    if (!targets.length) return [];
    const items = [];
    targets.forEach(({ item, question }) => {
      items.push({ kind: 'recovery-intro', target: item, question });
      relatedQuestions(question, 2).forEach((related) => items.push({ kind: 'question', activity: 'bank', q: related, recoveryTarget: item.id, related: true }));
    });
    targets.forEach(({ item, question }) => items.push({ kind: 'question', activity: 'bank', q: question, recoveryTarget: item.id, original: true }));
    return items;
  }
  function lessonQuestion(lesson) {
    return { ...lesson, question: lesson.prompt, explanation: lesson.lead };
  }
  function start(mode, category) {
    if (mode === 'visual') run = lessons.map((lesson, index) => ({ kind: 'question', activity: 'visual', q: lessonQuestion(lesson), lessonNumber: index + 1 }));
    else if (mode === 'hazard') run = hazards.map((hazard) => ({ kind: 'question', activity: 'hazard', q: { ...hazard, question: hazard.prompt, explanation: hazard.scene } }));
    else if (mode === 'recovery') run = recoveryRun();
    else run = smartQuestions(category).map((question) => ({ kind: 'question', activity: 'bank', q: question }));
    if (!run.length) run = smartQuestions().map((question) => ({ kind: 'question', activity: 'bank', q: question }));
    position = 0; answers = []; repaired = 0; answered = false; renderCurrent();
  }

  function visual(type, label) {
    const car = '<span class="scene-car"></span>';
    const person = '<span class="scene-person">●</span>';
    const base = '<span class="scene-road road-h"></span><span class="scene-road road-v"></span>';
    const descriptions = {
      fourway: 'Top-down four-way stop: Bryson is stopped at the south approach facing north. The orange vehicle is stopped at the east approach, on Bryson’s right.',
      roundabout: 'Top-down roundabout showing a vehicle already circulating before an entering vehicle.',
      merge: 'Freeway entrance ramp joining the right travel lane, with traffic already on the freeway.',
      leftturn: 'Intersection showing a left-turning vehicle yielding to an oncoming vehicle.',
      bus: 'School bus with a stop arm extended on a two-lane road.',
      rail: 'Vehicle stopped before railroad tracks with an active crossing signal.',
      pedestrian: 'Pedestrian using a marked crosswalk in front of a turning vehicle.',
      bike: 'Bicyclist and driver sharing the road with space between them.'
    };
    const parts = {
      fourway: base + '<span class="scene-car driver-car"><b>↑</b><small>Bryson</small></span><span class="scene-car right-car"><b>←</b><small>Vehicle on<br>your right</small></span>',
      roundabout: '<span class="scene-circle"></span><span class="scene-car car-left"></span><span class="scene-arrow arrow-curve">↻</span>',
      merge: '<span class="scene-road road-diagonal"></span><span class="scene-car car-ramp"></span><span class="scene-car car-freeway"></span><span class="scene-arrow arrow-merge">↗</span>',
      leftturn: base + car + '<span class="scene-car car-oncoming"></span><span class="scene-arrow arrow-left">↰</span>',
      bus: '<span class="scene-road road-h"></span><span class="scene-bus">STOP</span><span class="scene-stop-arm"></span>' + person,
      rail: '<span class="scene-road road-h"></span><span class="scene-rail"></span><span class="scene-light">✕</span>' + car,
      pedestrian: '<span class="scene-road road-h"></span><span class="scene-crosswalk"></span>' + person + car,
      bike: '<span class="scene-road road-h"></span><span class="scene-bike">◉</span>' + car,
      winter: '<span class="scene-road road-h icy"></span>' + car + '<span class="scene-snow">✦ ✦ ✦</span>',
      emergency: '<span class="scene-road road-h"></span><span class="scene-ambulance">✚</span>' + car,
      truck: '<span class="scene-road road-h"></span><span class="scene-truck"></span>' + car,
      rain: '<span class="scene-road road-h wet"></span>' + car + '<span class="scene-rain">⋮ ⋮ ⋮</span>',
      fog: '<span class="scene-road road-h foggy"></span>' + car + '<span class="scene-fog">≋ ≋ ≋</span>'
    };
    const caption = type === 'fourway' ? '' : `<figcaption>${esc(label)}</figcaption>`;
    return `<figure class="teaching-scene scene-${esc(type)}" role="img" aria-label="${esc(descriptions[type] || label)}">${parts[type] || base + car}${caption}</figure>`;
  }
  function renderCurrent() {
    const item = run[position];
    if (!item) { finish(); return; }
    if (item.kind === 'recovery-intro') { renderRecoveryIntro(item); return; }
    renderQuestion(item);
  }
  function renderRecoveryIntro(item) {
    const question = item.question;
    window.ACTIVE_STUDY_QUESTION = question;
    $('#app').innerHTML = `<section class="session"><div class="top"><button class="btn plain" onclick="learningDash()">Exit</button><div class="progress"><i style="width:${position / run.length * 100}%"></i></div><b>Recovery plan</b></div><article class="card recovery-card"><div class="eyebrow">Repair before retry</div><h1>Let’s rebuild ${esc(question.source.split('·').pop().trim())}.</h1><p class="muted">You missed this rule earlier. First, you’ll answer two connected questions. The original question returns only after there has been time to reinforce the concept.</p><div class="recovery-rule"><b>The rule to rebuild</b><br>${esc(question.explanation)}</div><div class="row"><button class="btn primary" onclick="learningNext()">Start related practice</button><button class="btn plain" data-handbook="${esc(question.id)}">Read handbook section</button></div></article></section>`;
  }
  function renderQuestion(item) {
    const question = item.q;
    window.ACTIVE_STUDY_QUESTION = question;
    const mode = item.activity === 'hazard' ? 'Hazard Lab' : item.activity === 'visual' ? `Visual lesson · Lesson ${item.lessonNumber}/${lessons.length}` : item.original ? 'Recovery check' : item.related ? 'Related practice' : question.category;
    const lead = item.activity === 'hazard' ? `<p class="scene-copy">${esc(question.scene)}</p>` : '';
    $('#app').innerHTML = `<section class="session"><div class="top"><button class="btn plain" onclick="learningDash()">Exit</button><div class="progress"><i style="width:${position / run.length * 100}%"></i></div><b>${item.activity === 'visual' ? `Lesson ${item.lessonNumber}/${lessons.length}` : `${position + 1}/${run.length}`}</b></div><article class="card question teaching-question"><div class="eyebrow">${esc(mode)} · ${esc(question.category)}</div>${item.activity === 'hazard' ? visual(question.type, question.title || question.scene) : ''}<h1>${esc(question.question)}</h1>${lead}<div class="options">${question.options.map((option, index) => `<button class="option" onclick="learningAnswer(${index})">${'ABCD'[index]}. ${esc(option)}</button>`).join('')}</div><div id="feedback" class="feedback"></div><button id="next" class="btn primary" style="display:none;margin-top:15px" onclick="learningNext()">${position === run.length - 1 ? 'Coach’s notes' : 'Next'}</button></article></section>`;
  }
  function distractorReason(question, index) {
    if (question.reasons) return question.reasons[index];
    const option = question.options[index].toLowerCase();
    if (/(always|never|only|immediately)/.test(option)) return `This makes the rule absolute when Utah law and safe driving require a specific condition. ${question.explanation}`;
    if (/(speed|accelerat|pass|shoulder|ignore|honk|follow closely)/.test(option)) return `This would add risk or violate a traffic rule. ${question.explanation}`;
    return `This does not match Utah’s required response in this situation. ${question.explanation}`;
  }
  function review(question, selected, correct) {
    return `<div class="answer-review"><b>Why each answer works—or doesn’t</b>${question.options.map((option, index) => `<div class="answer-reason ${index === question.answer ? 'right' : index === selected ? 'chosen-wrong' : ''}"><b>${'ABCD'[index]}. ${esc(option)}</b><p>${index === question.answer ? `Correct. ${esc(question.explanation)}` : esc(distractorReason(question, index))}</p></div>`).join('')}</div><div class="source">${esc(question.source)}</div>`;
  }
  function recordBank(question, correct, item) {
    const history = state.history[question.id] || { a: 0, n: 0, stage: 0 };
    history.a += 1; history.n += correct ? 1 : 0; history.last = Date.now();
    history.stage = correct ? Math.min(4, (history.stage || 0) + 1) : 0;
    history.due = Date.now() + [1, 3, 7, 14, 30][history.stage] * 86400000;
    state.history[question.id] = history;
    state.xp += correct ? 10 : 3;
    if (!correct) {
      let missed = state.missed.find((entry) => entry.id === question.id);
      if (!missed) { missed = { id: question.id, category: question.category, attempts: 0, recovered: false }; state.missed.push(missed); }
      missed.attempts += 1; missed.lastMissed = Date.now(); missed.recovered = false; missed.stage = 'needs-repair';
    }
    if (item.original && item.recoveryTarget) {
      const missed = state.missed.find((entry) => entry.id === item.recoveryTarget);
      if (missed) {
        missed.recovered = correct;
        missed.lastRecovery = Date.now();
        missed.stage = correct ? 'recovered' : 'needs-repair';
        if (correct) repaired += 1;
      }
    }
  }
  function recordActivity(question, correct) {
    const history = state.activityHistory[question.id] || { a: 0, n: 0 };
    history.a += 1; history.n += correct ? 1 : 0; history.last = Date.now();
    state.activityHistory[question.id] = history;
    state.xp += correct ? 8 : 2;
  }
  function answer(index) {
    if (answered) return;
    answered = true;
    const item = run[position];
    const question = item.q;
    const correct = index === question.answer;
    document.querySelectorAll('.option').forEach((button, optionIndex) => {
      button.disabled = true;
      if (optionIndex === question.answer) button.classList.add('correct');
      else if (optionIndex === index) button.classList.add('wrong');
    });
    if (item.activity === 'bank') recordBank(question, correct, item);
    else recordActivity(question, correct);
    answers.push({ question, correct, activity: item.activity, original: item.original });
    save();
    const feedback = $('#feedback');
    feedback.className = 'feedback show';
    const reveal = item.activity === 'visual' ? `<section class="lesson-reveal"><div class="eyebrow">See the rule in action</div>${visual(question.type, question.title)}<h3>${esc(question.title)}</h3><p>${esc(question.lead)}</p><ol class="teach-steps">${question.steps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol></section>` : '';
    feedback.innerHTML = `<b>${correct ? 'Correct—keep that rule.' : item.original ? 'Not yet—this rule stays in recovery.' : 'Pause here; this is the rule to keep.'}</b><br>${esc(question.explanation)}${reveal}${review(question, index, correct)}`;
    $('#next').style.display = 'inline-block';
  }
  function next() {
    position += 1; answered = false; renderCurrent();
  }
  function finish() {
    window.ACTIVE_STUDY_QUESTION = null;
    const correct = answers.filter((answer) => answer.correct).length;
    const misses = answers.filter((answer) => !answer.correct);
    state.sessions.push({ date: Date.now(), count: answers.length, pct: answers.length ? Math.round(correct / answers.length * 100) : 0, mode: run.some((item) => item.activity === 'hazard') ? 'hazard' : run.some((item) => item.activity === 'visual') ? 'visual' : 'practice' });
    save();
    $('#app').innerHTML = `<section class="session"><article class="card"><div class="eyebrow">Coach’s notes</div><h1>${correct}/${answers.length} correct</h1><p>${repaired ? `You repaired ${repaired} previously missed rule${repaired === 1 ? '' : 's'} by answering related material before the original check.` : misses.length ? `The highest-value next work is ${[...new Set(misses.map((entry) => entry.question.category))].join(' and ')}. Those concepts are now scheduled for connected practice.` : 'Clean session. You strengthened recognition and retained the underlying rules.'}</p><div class="report"><b>${achievements().length ? `Earned: ${achievements().join(' · ')}` : 'Keep going—your next meaningful learning milestone is within reach.'}</b></div><div class="row"><button class="btn primary" onclick="learningStart('recovery')">Mistake recovery</button><button class="btn soft" onclick="learningStart('hazard')">Hazard Lab</button><button class="btn plain" onclick="learningDash()">Dashboard</button></div></article></section>`;
  }

  window.learningStart = start;
  window.learningAnswer = answer;
  window.learningNext = next;
  window.learningDash = dashboard;
  window.setTheme = (theme) => { state.theme = theme; save(); dashboard(); };
  document.head.insertAdjacentHTML('beforeend', '<style>.teaching-question{overflow:hidden}.teaching-scene{position:relative;height:176px;margin:8px 0 18px;border-radius:16px;overflow:hidden;background:linear-gradient(#cbe5f7 0 46%,#6d7888 46%);border:1px solid #bad1e1}.teaching-scene figcaption{position:absolute;left:12px;bottom:9px;z-index:4;max-width:80%;padding:4px 8px;border-radius:8px;background:#112840d9;color:#fff;font-size:12px;font-weight:700}.scene-road{position:absolute;background:#4b5563}.road-h{left:-4%;right:-4%;height:48px;top:68px;border-top:2px dashed #ffe08a;border-bottom:2px dashed #ffe08a}.road-v{top:-10%;bottom:-10%;width:48px;left:calc(50% - 24px);border-left:2px dashed #ffe08a;border-right:2px dashed #ffe08a}.scene-car{position:absolute;width:38px;height:20px;border-radius:6px;background:#2265e5;box-shadow:0 2px 0 #163d90;left:26%;top:82px;z-index:2}.scene-car::before,.scene-car::after{content:"";position:absolute;bottom:-4px;width:8px;height:4px;background:#1d2938;border-radius:3px}.scene-car::before{left:5px}.scene-car::after{right:5px}.driver-car{left:calc(50% - 14px);top:118px;width:28px;height:42px}.right-car{left:68%;top:78px;width:47px;height:27px;background:#f4972e;box-shadow:0 2px 0 #a75014}.scene-car b{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:19px}.scene-car small{position:absolute;white-space:nowrap;font-size:11px;font-weight:900;color:#112840;line-height:1.05;text-align:center}.driver-car small{top:13px;right:36px;padding:3px 5px;border-radius:5px;background:#112840e6;color:#fff}.right-car small{top:-29px;left:50%;transform:translateX(-50%)}.car-left{left:21%;top:83px}.car-oncoming{left:59%;top:55px;background:#f4972e}.car-ramp{left:21%;top:112px}.car-freeway{left:58%;top:68px;background:#f4972e}.scene-arrow{position:absolute;z-index:3;color:#fff;font-size:32px;font-weight:900}.arrow-curve{left:50%;top:67px;color:#2265e5}.arrow-merge{left:44%;top:91px}.arrow-left{left:46%;top:54px}.scene-circle{position:absolute;width:104px;height:104px;border:26px solid #4b5563;border-radius:50%;left:calc(50% - 52px);top:35px;box-shadow:inset 0 0 0 2px #ffe08a}.road-diagonal{width:170px;height:46px;transform:rotate(-26deg);top:109px;left:-10px;border-top:2px dashed #ffe08a}.scene-bus{position:absolute;z-index:2;left:35%;top:69px;width:94px;padding:10px 3px;background:#f5b72a;border-radius:7px;color:#8d1e1e;text-align:center;font-size:11px;font-weight:900}.scene-stop-arm{position:absolute;z-index:2;left:61%;top:76px;width:23px;height:23px;background:#c73434;border-radius:50%;border:2px solid white}.scene-person{position:absolute;z-index:2;left:69%;top:83px;color:#24364a;font-size:27px}.scene-rail{position:absolute;z-index:2;top:45px;bottom:30px;left:51%;width:31px;border-left:5px solid #422d2d;border-right:5px solid #422d2d;background:repeating-linear-gradient(0deg,transparent 0 10px,#b99364 10px 13px)}.scene-light{position:absolute;z-index:3;left:58%;top:35px;width:32px;height:32px;border-radius:50%;background:#c73434;color:#fff;text-align:center;padding-top:3px;font-weight:900}.scene-crosswalk{position:absolute;z-index:2;left:48%;top:68px;width:67px;height:48px;background:repeating-linear-gradient(90deg,#fff 0 7px,transparent 7px 14px);opacity:.9}.scene-bike{position:absolute;z-index:2;left:64%;top:80px;font-size:40px;color:#3e536d}.icy,.wet{background:linear-gradient(90deg,#6a7b89,#97aebe,#6a7b89)}.scene-snow,.scene-rain,.scene-fog{position:absolute;z-index:2;color:#fff;font-weight:900;font-size:32px;letter-spacing:16px;left:18%;top:26px;opacity:.92}.scene-ambulance{position:absolute;z-index:2;left:64%;top:80px;width:52px;height:25px;border-radius:5px;background:#fff;color:#c73434;text-align:center;font-size:20px;font-weight:900}.scene-truck{position:absolute;z-index:2;left:54%;top:70px;width:104px;height:33px;border-radius:5px;background:#eee;box-shadow:-30px 10px 0 #2265e5}.foggy{opacity:.7}.scene-copy{margin:0 0 12px;color:var(--muted);font-weight:650}.teach-steps{margin:0 0 16px;padding-left:23px;color:var(--ink)}.teach-steps li{margin:5px 0}.answer-review{margin-top:15px;border-top:1px solid #dbe5ef;padding-top:13px}.answer-reason{margin:8px 0;padding:9px 10px;border-radius:10px;background:#fff;border:1px solid #dbe5ef}.answer-reason.right{background:#edfbf2;border-color:#8bd3a8}.answer-reason.chosen-wrong{background:#fff3f3;border-color:#efabab}.answer-reason p{margin:4px 0 0;font-size:13px;line-height:1.4}.recovery-card h1{font-size:clamp(27px,6vw,40px);line-height:1.08}.recovery-rule{margin:18px 0;padding:15px;border-radius:13px;background:#eef4ff;line-height:1.5}@media(max-width:500px){.teaching-scene{height:156px}.driver-car{top:104px}.right-car{left:65%}.answer-reason{padding:8px}.teach-steps{font-size:14px}}</style>');
  document.head.insertAdjacentHTML('beforeend', '<style>.lesson-reveal{margin-top:18px;padding-top:18px;border-top:1px solid #cddbea}.lesson-reveal h3{margin:6px 0}.lesson-reveal p{line-height:1.5}</style>');
  dashboard();
})();
