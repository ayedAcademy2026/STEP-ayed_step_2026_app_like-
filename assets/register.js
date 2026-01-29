
/* =========================================================
   Register page logic
   - Gate by unlock (test completion)
   - Prefill from results/profile
   - Validate form + receipt
   - Open Telegram with a prefilled message
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

  function buildTelegramMessage(form, res){
    const D = App.DATA || {};
    const bank = D.bank || {};
    const pricing = D.pricing || {};

    const g = res?.sections?.grammar?.pct ?? 0;
    const r = res?.sections?.reading?.pct ?? 0;
    const l = res?.sections?.listening?.pct ?? 0;
    const weak = res?.weakSection ? sectionName(res.weakSection) : '—';

    const planTitle = res?.plan?.title || 'خطة مذاكرة';
    const planTips = (res?.plan?.tips || []).slice(0,2);

    const priceActive = $('[data-price-active]') ? $('[data-price-active]').textContent : App.money(pricing.discountPrice ?? 449);

    // Keep message concise (URL length)
    const lines = [
      `**طلب تسجيل جديد — دورة STEP المكثفة 2026**`,
      ``,
      `**الاسم:** ${form.name}`,
      form.region ? `**المنطقة:** ${form.region}` : null,
      form.examDate ? `**موعد الاختبار:** ${form.examDate}` : (form.timeframeLabel ? `**موعد الاختبار:** ${form.timeframeLabel}` : null),
      form.tookBefore ? `**هل اختبرت STEP سابقاً؟** ${form.tookBefore}` : null,
      form.prevScore ? `**الدرجة السابقة:** ${form.prevScore}` : null,
      form.targetScore ? `**الدرجة المستهدفة:** ${form.targetScore}` : null,
      form.contactType ? `**وسيلة التواصل:** ${form.contactType} — ${form.contactValue || ''}` : null,
      form.notes ? `**ملاحظات:** ${form.notes}` : null,
      ``,
      `**ملخص اختبار تحديد المستوى**`,
      res ? `- **النتيجة العامة:** ${res.overallPct}%` : null,
      res ? `- **القواعد:** ${g}% | **القراءة:** ${r}% | **الاستماع:** ${l}%` : null,
      res ? `- **القسم الأضعف:** ${weak}` : null,
      ``,
      `**الخطة المقترحة**`,
      `- **نوع الخطة:** ${planTitle}`,
      ...(planTips.length ? planTips.map(t=>`- ${t}`) : [`- ثبّت روتين يومي + راجع أخطاءك.`]),
      ``,
      `**قيمة الاشتراك:** ${priceActive} ر.س`,
      ``,
      `**تم التحويل على البيانات التالية**`,
      `- البنك: **${bank.bankName || ''}**`,
      `- رقم الحساب: **${bank.accountNumber || ''}**`,
      `- الآيبان: **${bank.iban || ''}**`,
      `- اسم المستفيد: **${bank.beneficiary || ''}**`,
      ``,
      `**مرفق:** الإيصال (سأرفقه داخل المحادثة الآن للتأكيد النهائي)`,
      `_______`,
      `تنبيه: فضلاً لا تكرر الرسالة — فريق الأكاديمية يرد عليك بأقرب وقت ✅`
    ].filter(Boolean);

    return lines.join('\n');
  }

  function getTimeframeLabel(v){
    const map = {
      "lt24":"أقل من 24 ساعة",
      "3d":"خلال 3 أيام",
      "7d":"خلال 7 أيام",
      "15d":"خلال 15 يوم",
      "30d":"خلال شهر",
      "60d":"خلال شهرين",
      "90d":"خلال 3 شهور",
      "no_date":"لسى ما حجزت"
    };
    return map[v] || v;
  }

  function initSubnav(root){
    const buttons = $$('[data-subnav]', root);
    buttons.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        buttons.forEach(b=> b.classList.remove('active'));
        btn.classList.add('active');
        const id = btn.getAttribute('data-subnav');
        const el = document.getElementById(id);
        if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
      });
    });
  }

  function initReceipt(root){
    const input = $('#receipt', root);
    const drop = $('#receiptDrop', root);
    const label = $('#receiptLabel', root);
    if(!input || !drop) return;

    const setLabel = ()=>{
      const f = input.files && input.files[0];
      if(!label) return;
      if(!f) label.textContent = 'ارفق الإيصال (JPG/PNG/PDF) — سحب وإفلات أو اختر ملف';
      else label.textContent = `✅ تم اختيار الملف: ${f.name}`;
    };

    input.addEventListener('change', setLabel);

    const prevent = (e)=>{ e.preventDefault(); e.stopPropagation(); };

    ['dragenter','dragover','dragleave','drop'].forEach(ev=>{
      drop.addEventListener(ev, prevent);
    });
    ['dragenter','dragover'].forEach(ev=>{
      drop.addEventListener(ev, ()=> drop.classList.add('selected'));
    });
    ['dragleave','drop'].forEach(ev=>{
      drop.addEventListener(ev, ()=> drop.classList.remove('selected'));
    });

    drop.addEventListener('drop', (e)=>{
      const dt = e.dataTransfer;
      if(dt && dt.files && dt.files[0]){
        input.files = dt.files;
        setLabel();
      }
    });

    setLabel();
  }

  function validate(root){
    const alert = $('#registerAlert', root);
    const showAlert = (msg)=>{
      if(!alert) return;
      alert.innerHTML = msg;
      alert.classList.add('show');
      alert.scrollIntoView({behavior:'smooth', block:'start'});
    };
    const hideAlert = ()=> alert && alert.classList.remove('show');

    hideAlert();

    const name = ($('#r_name', root)?.value || '').trim();
    const receipt = $('#receipt', root)?.files?.[0] || null;
    const agree1 = $('#agree1', root)?.checked;
    const agree2 = $('#agree2', root)?.checked;
    const agree3 = $('#agree3', root)?.checked;

    if(!name){
      showAlert('اكتب اسمك (إجباري) — وبعدها كمل التسجيل.');
      return null;
    }

    if(!receipt){
      showAlert(`لازم ترفق الإيصال قبل الإرسال ✅<br><br>
        <button class="btn btn-primary" type="button" data-scroll="payBox">اذهب لبيانات التحويل</button>`);
      // wire the button after injection
      setTimeout(()=>{
        const b = alert.querySelector('[data-scroll="payBox"]');
        b && b.addEventListener('click', ()=>{
          const el = document.getElementById('payBox');
          el && el.scrollIntoView({behavior:'smooth', block:'start'});
        });
      }, 0);
      return null;
    }

    if(!agree1 || !agree2 || !agree3){
      showAlert('لازم توافق على التعهدات والسياسات قبل الإرسال.');
      return null;
    }

    const contactType = $('#r_contact_type', root)?.value || '';
    const contactValue = ($('#r_contact_value', root)?.value || '').trim();

    const form = {
      name,
      region: ($('#r_region', root)?.value || '').trim(),
      examDate: ($('#r_examdate', root)?.value || '').trim(),
      tookBefore: ($('#r_before', root)?.value || '').trim(),
      prevScore: ($('#r_prev', root)?.value || '').trim(),
      targetScore: ($('#r_target', root)?.value || '').trim(),
      contactType,
      contactValue,
      notes: ($('#r_notes', root)?.value || '').trim(),
      timeframeLabel: getTimeframeLabel(App.lsGet('profile', {})?.timeframe || '')
    };

    return form;
  }

  function renderSummary(root){
    const res = App.lsGet('result', null);
    const box = $('#planSummary', root);
    if(!box) return;

    if(!res){
      box.innerHTML = '<div class="muted">لم يتم العثور على نتيجة — ابدأ اختبار تحديد المستوى أولاً.</div>';
      return;
    }

    box.innerHTML = `
      <div class="grid cols-2">
        <div class="feature">
          <div class="ico">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l4 8 8 1-6 6 2 9-8-4-8 4 2-9-6-6 8-1z"/></svg>
          </div>
          <h3>ملخص نتيجتك</h3>
          <p>النتيجة العامة: <b>${res.overallPct}%</b> • المستوى: <b>${res.level?.label || ''}</b><br>
          القواعد ${res.sections.grammar.pct}% • القراءة ${res.sections.reading.pct}% • الاستماع ${res.sections.listening.pct}%</p>
        </div>

        <div class="feature">
          <div class="ico">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.5-7-10a7 7 0 0 1 14 0c0 5.5-7 10-7 10z"/></svg>
          </div>
          <h3>الخطة المقترحة لك</h3>
          <p><b>${res.plan?.title || ''}</b><br>
          قسمك الأضعف: <b>${sectionName(res.weakSection)}</b><br>
          <span class="small">الخطة تظهر هنا تلقائيًا عشان نرسلها مع رسالة التسجيل.</span></p>
        </div>
      </div>
    `;
  }

  function initRegister(){
    const root = document;
    const page = $('#registerRoot', root);
    if(!page) return;

    // Gate
    if(!App.isUnlocked()){
      App.toast('صفحة التسجيل تفتح بعد إنهاء اختبار تحديد المستوى 🎯', 'تنبيه');
      App.navigate('level-test.html');
      return;
    }

    initSubnav(root);
    // Scroll helpers
    root.querySelectorAll('[data-scroll]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-scroll');
        const el = document.getElementById(id);
        el && el.scrollIntoView({behavior:'smooth', block:'start'});
      });
    });

    initReceipt(root);
    renderSummary(root);

    // Prefill name from profile/result
    const res = App.lsGet('result', null);
    const profile = App.lsGet('profile', null);

    const nameInput = $('#r_name', root);
    if(nameInput && !nameInput.value){
      nameInput.value = (profile?.name || res?.profile?.name || '').trim();
    }

    const region = $('#r_region', root);
    if(region && !region.value && profile?.region) region.value = profile.region;

    const before = $('#r_before', root);
    if(before && !before.value && profile?.tookBefore) before.value = profile.tookBefore;

    const prev = $('#r_prev', root);
    if(prev && !prev.value && profile?.prevScore != null) prev.value = profile.prevScore;

    const target = $('#r_target', root);
    if(target && !target.value && profile?.targetScore != null) target.value = profile.targetScore;

    const examdate = $('#r_examdate', root);
    if(examdate && !examdate.value && profile?.examDate) examdate.value = profile.examDate;

    // Submit handler
    const form = $('#registerForm', root);
    const submitBtn = $('#registerSubmit', root);

    const onSubmit = (e)=>{
      e.preventDefault();
      const data = validate(root);
      if(!data) return;

      const msg = buildTelegramMessage(data, res);
      App.openTelegram(msg);
      App.toast('تم فتح تيليجرام برسالة جاهزة ✅ أرفق الإيصال داخل المحادثة', 'تم');

      // Soft success UI
      const ok = $('#registerOk', root);
      if(ok){
        ok.style.display='';
        ok.scrollIntoView({behavior:'smooth', block:'start'});
      }
    };

    form && form.addEventListener('submit', onSubmit);
    submitBtn && submitBtn.addEventListener('click', onSubmit);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initRegister);
  }else{
    initRegister();
  }
  window.addEventListener('app:navigated', initRegister);

})();
