// assets/support.js
(() => {
  function init(){
    const form = document.getElementById('supportForm');
    if(!form || !window.App) return;

    const nameEl = document.getElementById('supName');
    const typeEl = document.getElementById('supType');
    const subEl  = document.getElementById('supSubscriber');

    const amountEl = document.getElementById('supAmount');
    const timeEl   = document.getElementById('supTransferTime');
    const refEl    = document.getElementById('supRef');

    const phoneEl  = document.getElementById('supPhone');
    const dateEl   = document.getElementById('supTestDate');
    const msgEl    = document.getElementById('supMsg');

    const subscriberBlocks = Array.from(form.querySelectorAll('[data-subscriber]'));

    function syncSubscriber(){
      const isSub = (subEl && subEl.value === 'نعم');
      subscriberBlocks.forEach(b => { b.style.display = isSub ? '' : 'none'; });

      // ضع مبلغ افتراضي (من الموقع) إذا كان مشترك
      if(isSub && amountEl && !amountEl.value){
        const p = App.DATA?.pricing?.discountPrice;
        if(p) amountEl.value = String(p);
      }
    }

    if(subEl){
      subEl.addEventListener('change', syncSubscriber);
      syncSubscriber();
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = (nameEl?.value || '').trim();
      const type = (typeEl?.value || '').trim();
      const isSub = (subEl?.value || 'نعم') === 'نعم';

      const amount = (amountEl?.value || '').trim();
      const time = (timeEl?.value || '').trim();
      const ref = (refEl?.value || '').trim();

      const phone = (phoneEl?.value || '').trim();
      const testDate = (dateEl?.value || '').trim();
      const msg = (msgEl?.value || '').trim();

      if(!name){
        App.toast('اكتب اسمك عشان نقدر نخدمك بسرعة 🙏', 'تنبيه');
        nameEl?.focus();
        return;
      }
      if(!type){
        App.toast('حدد نوع الطلب عشان نوصل لك بسرعة ✅', 'تنبيه');
        typeEl?.focus();
        return;
      }
      if(!msg){
        App.toast('اكتب تفاصيل الطلب… حتى لو مختصر 👌', 'تنبيه');
        msgEl?.focus();
        return;
      }

      if(isSub){
        if(!amount){
          App.toast('للمشتركين: اكتب مبلغ التحويل.', 'تنبيه');
          amountEl?.focus();
          return;
        }
        if(!time){
          App.toast('للمشتركين: اكتب وقت التحويل (تقريبي).', 'تنبيه');
          timeEl?.focus();
          return;
        }
        if(!ref){
          App.toast('للمشتركين: اكتب مرجع/آخر 4 أرقام.', 'تنبيه');
          refEl?.focus();
          return;
        }
      }

      const lines = [];
      lines.push('السلام عليكم');
      lines.push(''); 
      lines.push('🟡 دعم أكاديمية عايد');
      lines.push('—');
      lines.push(`الاسم: ${name}`);
      lines.push(`نوع الطلب: ${type}`);
      lines.push(`مشترك/محول: ${isSub ? 'نعم' : 'لا'}`);
      if(phone) lines.push(`الجوال: ${phone}`);
      if(testDate) lines.push(`موعد اختبار STEP: ${testDate}`);

      if(isSub){
        lines.push(''); 
        lines.push('بيانات التحويل:');
        lines.push(`- المبلغ: ${amount}`);
        lines.push(`- وقت التحويل: ${time}`);
        lines.push(`- مرجع/آخر 4: ${ref}`);
        lines.push('');
        lines.push('ملاحظة: سأرفق الإيصال داخل نفس المحادثة.');
      }

      lines.push('');
      lines.push('تفاصيل الطلب:');
      lines.push(msg);

      App.openTelegram(lines.join('\n'));
      App.toast('تم تجهيز الرسالة ✅', 'تم');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('app:navigated', init);
})();
