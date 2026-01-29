
/* =========================================================
   Level Test (50 Q) — Step-like mock
   - Randomized from questions.json (400+)
   - Saves progress
   - Produces analysis + study plan
   ========================================================= */

(function(){
  'use strict';

  const App = window.App;
  if(!App) return;

  let QUESTIONS = null; // loaded bank {questions:[]}

  async function normalizeSection(section){
    const s = String(section||'').toLowerCase().trim();
    if(s === 'grammar' || s === 'vocabulary') return 'grammar';
    if(s === 'reading') return 'reading';
    if(s === 'listening') return 'listening';
    return 'grammar';
  }

  function normalizeQuestion(q){
    if(!q) return null;
    const nq = Object.assign({}, q);
    nq.id = String(nq.id ?? nq.qid ?? '').trim() || (Math.random().toString(36).slice(2));
    nq.section = normalizeSection(nq.section);
    if(nq.answerIndex == null && nq.correctIndex != null) nq.answerIndex = nq.correctIndex;
    if(nq.answerIndex == null && typeof nq.answer === 'number') nq.answerIndex = nq.answer;
    nq.difficulty = Number(nq.difficulty || 3);
    // normalize passage/transcript keys
    if(nq.passage == null && nq.passageText != null) nq.passage = nq.passageText;
    if(nq.transcript == null && nq.audioText != null) nq.transcript = nq.audioText;
    // normalize options
    if(!Array.isArray(nq.options) && Array.isArray(nq.choices)) nq.options = nq.choices;
    return nq;
  }

  function normalizeBank(data){
    if(Array.isArray(data)) data = {questions: data};
    if(!data || typeof data !== 'object') data = {questions: []};
    if(!Array.isArray(data.questions)) data.questions = [];
    data.questions = data.questions.map(normalizeQuestion).filter(Boolean);
    return data;
  }

  function loadBank(){
    if(QUESTIONS) return Promise.resolve(QUESTIONS);
    return fetch('./assets/questions.json', {cache:'no-store'}).then(r => {
      if(!r.ok) throw new Error('questions.json not found');
      return r.json();
    }).then(raw => {
      QUESTIONS = normalizeBank(raw);
      return QUESTIONS;
    }).catch(err => {
      console.error(err);
      QUESTIONS = {questions: []};
      return QUESTIONS;
    });
  }

  function bySection(list){
    const map = {grammar:[], reading:[], listening:[]};
    list.forEach(q=>{ if(map[q.section]) map[q.section].push(q); });
    return map;
  }

  function pickQuestions(bank, attempt, lastIds){
    const dist = App.DATA?.test?.distribution || {grammar:20, reading:20, listening:10};

    // Difficulty ramp (more difficult over attempts)
    const minByAttempt = attempt >= 3 ? 3 : (attempt === 2 ? 2 : 1);

    const sections = bySection(bank);
    const picked = [];

    Object.keys(dist).forEach(sec=>{
      const need = dist[sec];
      let pool = sections[sec] || [];

      // Prefer not repeating last attempt
      const noRepeat = pool.filter(q=> !lastIds.includes(q.id));
      pool = noRepeat.length >= need ? noRepeat : pool;

      // Prefer higher difficulty as attempt increases
      const poolHard = pool.filter(q => (q.difficulty || 1) >= minByAttempt);
      pool = poolHard.length >= need ? poolHard : pool;

      // Shuffle and pick
      pool = pool.slice();
      for(let i=pool.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      picked.push(...pool.slice(0, need));
    });

    // Final shuffle across sections
    for(let i=picked.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [picked[i], picked[j]] = [picked[j], picked[i]];
    }

    return picked;
  }

  function percent(n, d){
    if(!d) return 0;
    return Math.round((n/d)*100);
  }


  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  function classifyLevel(p){
    if(p < 45) return {label:'مبتدئ', note:'ركّز على الأساسيات + تطبيق يومي.'};
    if(p < 70) return {label:'متوسط', note:'مستواك جيد — نحتاج نرفع الدقة والوقت.'};
    return {label:'متقدم', note:'ممتاز — الآن ركّز على نمط الأسئلة ورفع السرعة.'};
  }

  function sectionName(sec){
    return sec === 'grammar' ? 'القواعد' : (sec === 'reading' ? 'القراءة' : 'الاستماع');
  }

  function buildPlan(profile, analysis){
    const tf = profile?.timeframe || '7d';
    const weak = analysis.weakSection;
    const level = analysis.levelLabel;

    const emphasize = (sec) => (sec === weak);

    const tips = [];
    if(weak === 'listening') tips.push('ركّز على التقاط الفكرة العامة أولاً ثم التفاصيل (Keywords فقط).');
    if(weak === 'reading') tips.push('طبق Skim ثم Scan — ولا تتعلق بسؤال.');
    if(weak === 'grammar') tips.push('افهم القاعدة ثم طبّق عليها مباشرة (بدون حفظ عشوائي).');

    // Booking advice
    let bookingAdvice = '';
    if(tf === 'no_date'){
      if(analysis.overallPct >= 75){
        bookingAdvice = 'مستواك يسمح لك تحجز بعد **10–14 يوم** تدريب منتظم (مع نماذج 49–51).';
      }else if(analysis.overallPct >= 55){
        bookingAdvice = 'ننصح تحجز بعد **3–4 أسابيع** (خطة 30 يوم) عشان ترفع الدقة وتثبت الأساس.';
      }else{
        bookingAdvice = 'ننصح تحجز بعد **6–8 أسابيع** (خطة 60 يوم) لبناء أساس قوي ثم نماذج كاملة.';
      }
    }

    const plans = {
      "lt24": {
        title: "خطة يوم واحد (خطة إنقاذ)",
        days: [
          {label:"اليوم (قبل الاختبار)", tag:"إنقاذ", tasks:[
            "ساعة صباحًا: راجع استراتيجيات القراءة + الاستماع (فكرة عامة + كلمات مفتاحية).",
            "ساعتان: حل نموذج Reading واحد + Listening بدون مقاطع، ثم راجع الحل بسرعة.",
            "ساعة مساءً: مراجعة أخطاء القواعد الشائعة + روابط/كلمات الربط.",
            "آخر 20 دقيقة: ركّز على **نماذج 50 و 51** (فهم النمط، مو كثرة حل)."
          ]}
        ]
      },
      "3d": {
        title: "خطة 3 أيام (مكثفة)",
        days: [
          {label:"اليوم 1", tag:"تمهيدي", tasks:[
            "المحاضرات التمهيدية (تعرف نمط الاختبار + خطة الدورة).",
            "حل اختبار تجريبي تمهيدي مصغّر وتدوين الأخطاء.",
            emphasize('grammar') ? "تركيز إضافي: قواعد الأزمنة + الشرطية (If)." : "مراجعة سريعة للقواعد الأساسية."
          ]},
          {label:"اليوم 2", tag:"تركيز", tasks:[
            emphasize('reading') ? "تقنيات Reading: Skim/Scan + حل قطعتين بالوقت." : "حل قطعة Reading واحدة بالوقت + مراجعة الإجابات.",
            emphasize('listening') ? "Listening: تدريب يومي (Keywords) + 3 مقاطع قصيرة." : "Listening: مقطع واحد + تدوين كلمات مفتاحية.",
            "مراجعة مفردات وكلمات ربط متكررة."
          ]},
          {label:"اليوم 3", tag:"محاكاة", tasks:[
            "حل نموذج محاكي قصير (Mix).",
            "راجع أخطاءك — اكتبها بورقة وحدة.",
            "ركّز على **نماذج 49–51** (خصوصًا 50 و 51) كنمط أسئلة.",
          ]}
        ]
      },
      "7d": {
        title:"خطة 7 أيام (الأكثر طلبًا)",
        days:[
          {label:"اليوم 1", tag:"تأسيس", tasks:[
            "المحاضرات التمهيدية + فهم تقسيم الاختبار.",
            emphasize('grammar') ? "قواعد: الأزمنة الأساسية + 20 سؤال تطبيق." : "قواعد: مراجعة سريعة + 10 أسئلة."
          ]},
          {label:"اليوم 2", tag:"قواعد", tasks:[
            "قواعد: الشرطية (If) + Agreement + Error Spotting.",
            "حل نموذج قواعد قصير + تدوين الأخطاء."
          ]},
          {label:"اليوم 3", tag:"Reading", tasks:[
            "Reading: Skim/Scan + Main Idea/Inference.",
            "حل قطعتين بالوقت + مراجعة سريعة."
          ]},
          {label:"اليوم 4", tag:"Listening", tasks:[
            "Listening: استراتيجية الكلمات المفتاحية + التدريب القصير.",
            "حل Listening قصير + مراجعة الإجابات."
          ]},
          {label:"اليوم 5", tag:"Mix", tasks:[
            "تمارين مختلطة (Grammar+Reading+Listening).",
            emphasize(weak) ? "زيادة 15 دقيقة إضافية على قسم ضعفك." : "ثبّت الروتين."
          ]},
          {label:"اليوم 6", tag:"نماذج", tasks:[
            "حل نموذج محاكي (جزئي/كامل حسب وقتك).",
            "ابدأ بنموذج **50** ثم راجع أخطاءه."
          ]},
          {label:"اليوم 7", tag:"إغلاق", tasks:[
            "حل نموذج أخير (يفضل **51**).",
            "مراجعة ورقة الأخطاء + كلمات الربط + إدارة الوقت.",
            "نوم بدري — ولا تذاكر للآخر لحظة."
          ]}
        ]
      },
      "15d": {
        title:"خطة 15 يوم (تثبيت + رفع مستوى)",
        days:[
          {label:"الأيام 1–3", tag:"تمهيدي", tasks:[
            "المحاضرات التمهيدية بالكامل + ملف تمهيدي (حل ثم حلول).",
            "تحديد روتين ثابت: 45–60 دقيقة يوميًا."
          ]},
          {label:"الأيام 4–7", tag:"Grammar", tasks:[
            "دروس القواعد: الأزمنة + الشرطية + ضمائر الوصل.",
            "حل نماذج قواعد (غير محلولة) ثم مراجعة الحلول."
          ]},
          {label:"الأيام 8–10", tag:"Reading", tasks:[
            "استراتيجيات القراءة + قطع متكررة.",
            "حل 1–2 قطعة يوميًا بالوقت + مراجعة الإجابات."
          ]},
          {label:"اليوم 11–12", tag:"Listening", tasks:[
            "استراتيجيات الاستماع + نماذج قصيرة.",
            "تدريب يومي 30 دقيقة (Keywords)."
          ]},
          {label:"اليوم 13–15", tag:"Mock + Analysis", tasks:[
            "حل نموذج كامل + تحليل أخطاء مفصل.",
            "ركّز على نماذج **49–51** (الأحدث)."
          ]}
        ]
      },
      "30d": {
        title:"خطة 30 يوم (منهجية وهادئة)",
        days:[
          {label:"الأسبوع 1", tag:"تأسيس", tasks:[
            "تمهيدي + فهم نمط الاختبار.",
            "بناء مفردات يوميًا (15 دقيقة)."
          ]},
          {label:"الأسبوع 2", tag:"Grammar", tasks:[
            "قواعد كاملة + أسئلة مراجعة.",
            emphasize('grammar') ? "زيادة تطبيق يومي + حل نماذج أكثر." : "حل نماذج قواعد تدريجيًا."
          ]},
          {label:"الأسبوع 3", tag:"Reading + Exceptions", tasks:[
            "قراءة: استراتيجيات + قطع متكررة + كبسولة الإنقاذ.",
            "استثناءات القواعد (لرفع الدرجة)."
          ]},
          {label:"الأسبوع 4", tag:"Listening + Mock", tasks:[
            "استماع: تدريبات ثابتة + نماذج.",
            "نماذج كاملة + مراجعة أخطاء.",
            "آخر 3 أيام: نماذج **50 و 51**."
          ]}
        ]
      },
      "60d": {
        title:"خطة 60 يوم (أساس قوي + نماذج)",
        days:[
          {label:"الشهر 1", tag:"أساس", tasks:[
            "تمهيدي + قواعد أساسية + Reading تدريجي.",
            "جلسات قصيرة ثابتة — لا تشتت مصادر."
          ]},
          {label:"الشهر 2", tag:"نماذج + تثبيت", tasks:[
            "حل نموذج كل يومين + مراجعة أخطاء.",
            "Listening + Reading بالوقت.",
            "مراجعة استثناءات متقدمة + نماذج **49–51** قبل الاختبار."
          ]}
        ]
      },
      "90d": {
        title:"خطة 90 يوم (3 شهور — الأفضل للبناء)",
        days:[
          {label:"الشهر 1", tag:"أساس", tasks:[
            "محاضرات تمهيدية + قواعد أساسية + مفردات يومية.",
            "خرائط مفاهيم القواعد للمراجعة السريعة."
          ]},
          {label:"الشهر 2", tag:"Reading + Exceptions", tasks:[
            "قراءة: قطع مطولة + استراتيجيات + قطع متكررة.",
            "استثناءات القواعد لرفع الدقة."
          ]},
          {label:"الشهر 3", tag:"Listening + Mock", tasks:[
            "استماع: تدريب ثابت + نماذج.",
            "نماذج كاملة أسبوعيًا + تحليل.",
            "آخر أسبوع: **نماذج 50 و 51**."
          ]}
        ]
      }
    };

    const plan = plans[tf] || plans["7d"];

    return {
      title: plan.title,
      tips,
      bookingAdvice,
      days: plan.days
    };
  }

  function storeResult(result){
    App.lsSet('result', result);
    App.lsSet('lastQuestionIds', result.questionIds || []);
    App.setUnlocked(true);
  }

  function clearTestState(){
    App.lsDel('testState');
  }

  function renderStartState(root){
    const resumeBtn = App.$('[data-resume]', root);
    const startBtn = App.$('[data-start]', root);
    const resetBtn = App.$('[data-reset]', root);

    const state = App.lsGet('testState', null);
    if(state && state.questionIds && state.questionIds.length){
      resumeBtn.style.display = '';
      resetBtn.style.display = '';
    }else{
      resumeBtn.style.display = 'none';
      resetBtn.style.display = 'none';
    }

    resumeBtn && resumeBtn.addEventListener('click', ()=> startTest(root, {resume:true}));
    resetBtn && resetBtn.addEventListener('click', ()=>{
      clearTestState();
      App.toast('تم حذف التقدم المحفوظ ✅', 'إعادة ضبط');
      renderStartState(root);
    });
    startBtn && startBtn.addEventListener('click', ()=> startTest(root, {resume:false}));
  }

  function getProfileFromForm(root){
    const name = (App.$('#p_name', root)?.value || '').trim();
    const goal = App.$('#p_goal', root)?.value || '';
    const region = App.$('#p_region', root)?.value || '';
    const hardest = App.$('#p_hardest', root)?.value || '';
    const style = App.$('#p_style', root)?.value || '';
    const tookBefore = App.$('#p_before', root)?.value || 'no';
    const prevScore = App.$('#p_prev', root)?.value || '';
    const targetScore = App.$('#p_target', root)?.value || '';
    const timeframe = App.$('#p_timeframe', root)?.value || '7d';
    const examDate = App.$('#p_examdate', root)?.value || '';

    return {
      name,
      goal,
      region,
      hardest,
      style,
      tookBefore,
      prevScore: prevScore ? Number(prevScore) : null,
      targetScore: targetScore ? Number(targetScore) : null,
      timeframe,
      examDate
    };
  }

  function validateProfile(p){
    if(!p.name) return 'اكتب اسمك (إجباري) عشان نطلع الخطة باسمك.';
    return '';
  }

  function startTest(root, {resume}){
    const intake = App.$('#intake', root);
    const test = App.$('#testApp', root);

    if(!intake || !test) return;

    if(resume){
      const st = App.lsGet('testState', null);
      if(!st || !st.questionIds || !st.questionIds.length){
        App.toast('ما فيه تقدم محفوظ — ابدأ اختبار جديد', 'معلومة');
        return;
      }
      intake.style.display='none';
      test.style.display='';
      runTest(root, st);
      return;
    }

    const profile = getProfileFromForm(root);
    const err = validateProfile(profile);
    if(err){
      App.toast(err, 'تنبيه');
      return;
    }
    App.lsSet('profile', profile);

    // new attempt
    const attempt = (App.lsGet('attempt', 0) || 0) + 1;
    App.lsSet('attempt', attempt);

    // build new test state
    loadBank().then(data=>{
      const lastIds = App.lsGet('lastQuestionIds', []) || [];
      const selected = pickQuestions(data.questions || [], attempt, lastIds);
      if(!selected.length){
        App.toast('تعذر تشغيل الاختبار حالياً. حدّث الصفحة وجرب مرة ثانية.', 'تنبيه');
        return;
      }
      const state = {
        attempt,
        createdAt: Date.now(),
        questionIds: selected.map(q=>q.id),
        answers: Array(selected.length).fill(null),
        current: 0
      };
      App.lsSet('testState', state);

      intake.style.display='none';
      test.style.display='';
      runTest(root, state);
    }).catch(()=>{
      App.toast('تعذر تحميل بنك الأسئلة — حاول مرة ثانية', 'خطأ');
    });
  }

  function runTest(root, state){
    const ui = {
      qIndex: App.$('[data-q-index]', root),
      qTotal: App.$('[data-q-total]', root),
      section: App.$('[data-q-section]', root),
      diff: App.$('[data-q-diff]', root),
      prompt: App.$('[data-q-prompt]', root),
      passageWrap: App.$('[data-q-passage-wrap]', root),
      passage: App.$('[data-q-passage]', root),
      options: App.$('[data-q-options]', root),
      bar: App.$('[data-q-bar]', root),
      prev: App.$('[data-prev]', root),
      next: App.$('[data-next]', root),
      gridBtn: App.$('[data-grid]', root),
      grid: App.$('[data-grid-wrap]', root),
      nums: App.$('[data-grid-nums]', root),
      finish: App.$('[data-finish]', root),
      saveHint: App.$('[data-save-hint]', root),
    };

    const save = (patch)=>{
      const s = Object.assign({}, App.lsGet('testState', state), patch || {});
      App.lsSet('testState', s);
      state = s;
    };

    function getQuestionById(id){
      const bank = QUESTIONS?.questions || [];
      return bank.find(q=>q.id === id);
    }

    function renderGrid(){
      if(!ui.nums) return;
      ui.nums.innerHTML = '';
      const total = state.questionIds.length;
      for(let i=0;i<total;i++){
        const b = document.createElement('button');
        b.type='button';
        b.className = 'num';
        b.textContent = String(i+1);
        if(state.answers[i] != null) b.classList.add('ans');
        if(i === state.current) b.classList.add('cur');
        b.addEventListener('click', ()=>{
          save({current:i});
          render();
        });
        ui.nums.appendChild(b);
      }
    }

    function render(){
      const total = state.questionIds.length;
      const i = clamp(state.current, 0, total-1);
      const q = getQuestionById(state.questionIds[i]);
      if(!q) return;

      ui.qIndex && (ui.qIndex.textContent = String(i+1));
      ui.qTotal && (ui.qTotal.textContent = String(total));
      ui.section && (ui.section.textContent = sectionName(q.section));
      ui.diff && (ui.diff.textContent = `صعوبة ${q.difficulty || 1}/5`);

      // progress bar
      if(ui.bar){
        const pct = ((i)/Math.max(1,total-1))*100;
        ui.bar.style.width = pct.toFixed(1)+'%';
      }

      // passage (reading)
      if(q.section === 'reading' && q.passage){
        ui.passageWrap && (ui.passageWrap.style.display='');
        ui.passage && (ui.passage.textContent = q.passage);
      }else if(q.section === 'listening' && q.transcript){
        ui.passageWrap && (ui.passageWrap.style.display='');
        ui.passage && (ui.passage.textContent = "Listening transcript: " + q.transcript);
      }else{
        ui.passageWrap && (ui.passageWrap.style.display='none');
      }

      ui.prompt && (ui.prompt.innerHTML = q.prompt);

      // options
      if(ui.options){
        ui.options.innerHTML = '';
        q.options.forEach((opt, idx)=>{
          const div = document.createElement('div');
          div.className = 'opt' + (state.answers[i] === idx ? ' selected' : '');
          div.innerHTML = `<div class="radio"></div><div class="txt">${opt}</div>`;
          div.addEventListener('click', ()=>{
            const ans = state.answers.slice();
            ans[i] = idx;
            save({answers: ans});
            render(); // re-render to highlight
          });
          ui.options.appendChild(div);
        });
      }

      ui.prev && (ui.prev.disabled = (i===0));
      ui.next && (ui.next.disabled = (i===total-1));

      renderGrid();

      ui.saveHint && (ui.saveHint.textContent = '✓ تم حفظ تقدمك تلقائيًا');
    }

    ui.prev && ui.prev.addEventListener('click', ()=>{
      save({current: Math.max(0, state.current-1)});
      render();
    });
    ui.next && ui.next.addEventListener('click', ()=>{
      save({current: Math.min(state.questionIds.length-1, state.current+1)});
      render();
    });

    ui.gridBtn && ui.gridBtn.addEventListener('click', ()=>{
      ui.grid && ui.grid.classList.toggle('open');
      renderGrid();
    });

    ui.finish && ui.finish.addEventListener('click', ()=> finishTest(state));

    render();
  }

  function finishTest(state){
    loadBank().then(data=>{
      const bank = data.questions || [];
      const qById = (id)=> bank.find(q=>q.id===id);

      const answers = state.answers || [];
      const questionIds = state.questionIds || [];

      const total = questionIds.length;
      let correct = 0;

      const secStats = {
        grammar:{correct:0,total:0},
        reading:{correct:0,total:0},
        listening:{correct:0,total:0}
      };

      const review = [];

      for(let i=0;i<total;i++){
        const q = qById(questionIds[i]);
        if(!q) continue;
        const a = answers[i];
        const correctIndex = (q.answerIndex != null ? q.answerIndex : q.correctIndex);
        const isCorrect = (a != null && a === correctIndex);
        if(isCorrect) correct++;
        secStats[q.section].total++;
        if(isCorrect) secStats[q.section].correct++;

        review.push({
          id: q.id,
          section: q.section,
          chosen: a,
          correctIndex: correctIndex
        });
      }

      const overallPct = percent(correct, total);
      const grammarPct = percent(secStats.grammar.correct, secStats.grammar.total);
      const readingPct = percent(secStats.reading.correct, secStats.reading.total);
      const listeningPct = percent(secStats.listening.correct, secStats.listening.total);

      // Weak section
      const pairs = [
        ['grammar', grammarPct],
        ['reading', readingPct],
        ['listening', listeningPct]
      ].sort((a,b)=> a[1]-b[1]);
      const weakSection = pairs[0][0];

      const levelInfo = classifyLevel(overallPct);

      const profile = App.lsGet('profile', {}) || {};
      const plan = buildPlan(profile, {overallPct, weakSection, levelLabel: levelInfo.label});

      const result = {
        version: '2026.01',
        createdAt: Date.now(),
        attempt: state.attempt || 1,
        profile,
        overallPct,
        correct,
        total,
        sections: {
          grammar: {pct: grammarPct, ...secStats.grammar},
          reading: {pct: readingPct, ...secStats.reading},
          listening: {pct: listeningPct, ...secStats.listening},
        },
        weakSection,
        level: levelInfo,
        plan,
        review
      };

      storeResult(result);
      App.lsDel('testState');

      // Navigate to results
      if(window.App && window.App.navigate){
        window.App.navigate('results.html');
      }else{
        window.location.href = 'results.html';
      }

    }).catch(()=>{
      App.toast('تعذر حساب النتيجة — حاول مرة ثانية', 'خطأ');
    });
  }

  function initLevelTest(){
    const root = document;
    const page = App.$('#levelTestRoot', root);
    if(!page) return;

    // If bank is not loaded yet, load in background
    loadBank().catch(()=>{});

    // Render start state and prefill profile
    const profile = App.lsGet('profile', null);
    if(profile){
      const map = {
        p_name: profile.name || '',
        p_goal: profile.goal || '',
        p_region: profile.region || '',
        p_hardest: profile.hardest || '',
        p_style: profile.style || '',
        p_before: profile.tookBefore || 'no',
        p_prev: profile.prevScore ?? '',
        p_target: profile.targetScore ?? '',
        p_timeframe: profile.timeframe || '7d',
        p_examdate: profile.examDate || '',
      };
      Object.keys(map).forEach(id=>{
        const el = document.getElementById(id);
        if(el && map[id] !== undefined && map[id] !== null && map[id] !== '') el.value = map[id];
      });
    }

    // If test is in progress, show intake but with resume
    renderStartState(root);
  }

  // Boot on normal load + SPA navigation
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initLevelTest);
  }else{
    initLevelTest();
  }
  window.addEventListener('app:navigated', initLevelTest);

})();
