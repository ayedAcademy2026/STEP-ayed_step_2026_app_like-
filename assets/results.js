
/* =========================================================
   Results page renderer
   - Reads localStorage result
   - Renders analysis + plan
   - Share buttons
   ========================================================= */

(function(){
  'use strict';

  const App = window.App;
  if(!App) return;

  const $ = App.$;
  const $$ = App.$$;

  function sectionName(sec){
    return sec === 'grammar' ? 'القواعد' : (sec === 'reading' ? 'القراءة' : 'الاستماع');
  }

  function buildShareText(res){
    const name = res.profile?.name ? `أنا ${res.profile.name}` : 'نتيجتي';
    const g = res.sections?.grammar?.pct ?? 0;
    const r = res.sections?.reading?.pct ?? 0;
    const l = res.sections?.listening?.pct ?? 0;
    const plan = res.plan?.title || 'خطة مذاكرة';
    const url = new URL('level-test.html', location.href).toString();
    return `${name} في اختبار تحديد المستوى STEP: ${res.overallPct}% (قواعد ${g}% • قراءة ${r}% • استماع ${l}%).\nالخطة المقترحة: ${plan}\nجرّب الاختبار وخلك على خطة واضحة: ${url}`;
  }

  function render(res){
    // Greeting
    const nameEl = $('[data-r-name]');
    if(nameEl){
      nameEl.textContent = res.profile?.name ? `يا ${res.profile.name}` : 'يا بطل';
    }

    // KPIs
    $('[data-overall]') && ($('[data-overall]').textContent = String(res.overallPct) + '%');
    $('[data-level]') && ($('[data-level]').textContent = res.level?.label || '—');
    $('[data-level-note]') && ($('[data-level-note]').textContent = res.level?.note || '');

    // Bars
    const barMap = {
      grammar: '[data-bar-grammar]',
      reading: '[data-bar-reading]',
      listening:'[data-bar-listening]'
    };
    Object.keys(barMap).forEach(sec=>{
      const pct = res.sections?.[sec]?.pct ?? 0;
      const el = $(barMap[sec]);
      if(el){
        requestAnimationFrame(()=> el.style.width = pct + '%');
      }
      const txt = $(`[data-pct="${sec}"]`);
      if(txt) txt.textContent = pct + '%';
    });

    // Weak section label
    const weak = res.weakSection;
    const weakEl = $('[data-weak]');
    if(weakEl) weakEl.textContent = sectionName(weak);

    // Booking advice
    const booking = res.plan?.bookingAdvice || '';
    const bookEl = $('[data-booking]');
    if(bookEl){
      if(booking){
        bookEl.style.display='';
        bookEl.innerHTML = booking;
      }else{
        bookEl.style.display='none';
      }
    }

    // Tips
    const tipsEl = $('[data-tips]');
    if(tipsEl){
      const tips = res.plan?.tips || [];
      if(tips.length){
        tipsEl.innerHTML = tips.map(t=>`<li>${t}</li>`).join('');
      }else{
        tipsEl.innerHTML = '<li>ثبّت روتين يومي — وراجع أخطاءك.</li>';
      }
    }

    // Plan
    const planEl = $('[data-plan]');
    const planTitleEl = $('[data-plan-title]');
    if(planTitleEl) planTitleEl.textContent = res.plan?.title || 'خطتك';
    if(planEl){
      planEl.innerHTML = '';
      (res.plan?.days || []).forEach(day=>{
        const div = document.createElement('div');
        div.className = 'day';
        div.innerHTML = `
          <div class="top">
            <b>${day.label}</b>
            <span class="tag">${day.tag || 'خطة'}</span>
          </div>
          <ul>${(day.tasks || []).map(t=>`<li>${t}</li>`).join('')}</ul>
        `;
        planEl.appendChild(div);
      });
    }

    // Share buttons
    const shareBtn = $('[data-share]');
    const copyBtn = $('[data-copy-share]');
    const shareText = buildShareText(res);

    shareBtn && shareBtn.addEventListener('click', async ()=>{
      try{
        if(navigator.share){
          await navigator.share({
            title: 'خطة مذاكرة STEP — أكاديمية عايد',
            text: shareText,
            url: location.href
          });
          App.toast('تمت المشاركة ✅', 'مشاركة');
        }else{
          await navigator.clipboard.writeText(shareText);
          App.toast('تم نسخ نص المشاركة ✅', 'مشاركة');
        }
      }catch(e){
        App.toast('تعذر المشاركة — جرّب مرة ثانية', 'تنبيه');
      }
    });

    copyBtn && copyBtn.addEventListener('click', async ()=>{
      try{
        await navigator.clipboard.writeText(shareText);
        App.toast('تم نسخ نص المشاركة ✅', 'نسخ');
      }catch(e){
        App.toast('تعذر النسخ — انسخ يدويًا', 'تنبيه');
      }
    });

    // CTA to Register
    const regBtn = $('[data-go-register]');
    if(regBtn){
      regBtn.addEventListener('click', ()=>{
        if(!App.isUnlocked()){
          App.toast('التسجيل يفتح بعد إنهاء اختبار تحديد المستوى 🎯', 'ملاحظة');
          App.navigate('level-test.html');
          return;
        }
        App.navigate('register.html');
      });
    }

    // Print plan (optional)
    const printBtn = $('[data-print]');
    printBtn && printBtn.addEventListener('click', ()=>{
      const w = window.open('', '_blank', 'noopener');
      if(!w) return;
      const html = `
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="utf-8"/>
            <title>خطة مذاكرة — ${res.profile?.name || ''}</title>
            <style>
              body{font-family:Tahoma,Arial,sans-serif; padding:18px; line-height:1.8}
              h1{font-size:18px}
              .box{border:1px solid #ddd; padding:12px; border-radius:10px; margin-top:12px}
              ul{margin:8px 0; padding-right:18px}
              small{color:#555}
            </style>
          </head>
          <body>
            <h1>خطة مذاكرة STEP — ${res.plan?.title || ''}</h1>
            <small>النتيجة العامة: ${res.overallPct}% • المستوى: ${res.level?.label || ''}</small>
            ${(res.plan?.days || []).map(d=>`
              <div class="box">
                <b>${d.label}</b> — <small>${d.tag || ''}</small>
                <ul>${(d.tasks||[]).map(t=>`<li>${t}</li>`).join('')}</ul>
              </div>
            `).join('')}
            <script>window.print();<\/script>
          </body>
        </html>
      `;
      w.document.open();
      w.document.write(html);
      w.document.close();
    });

  }

  function initResults(){
    const root = document;
    const page = $('#resultsRoot', root);
    if(!page) return;

    const res = App.lsGet('result', null);
    const empty = $('#resultsEmpty', root);
    const content = $('#resultsContent', root);

    if(!res){
      if(empty) empty.style.display='';
      if(content) content.style.display='none';

      const startBtn = $('[data-start-test]', root);
      startBtn && startBtn.addEventListener('click', ()=> App.navigate('level-test.html'));
      return;
    }

    if(empty) empty.style.display='none';
    if(content) content.style.display='';

    render(res);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initResults);
  }else{
    initResults();
  }
  window.addEventListener('app:navigated', initResults);

})();
