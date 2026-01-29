
/* =========================================================
   أكاديمية عايد — App Core (SPA-like + PWA + UI helpers)
   Vanilla JS • Mobile-First • RTL
   ========================================================= */

(function(){
  'use strict';

  const DATA = window.SITE_DATA || {};
  const LS_PREFIX = (DATA?.test?.saveKey || 'ayed_step2026') + '_';
  const now = () => Date.now();

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pad2 = (n) => String(n).padStart(2,'0');

  function formatTime(ms){
    const s = Math.max(0, Math.floor(ms/1000));
    const d = Math.floor(s/86400);
    const h = Math.floor((s%86400)/3600);
    const m = Math.floor((s%3600)/60);
    const ss = s%60;
    if (d>0) return `${d} يوم • ${pad2(h)}:${pad2(m)}:${pad2(ss)}`;
    return `${pad2(h)}:${pad2(m)}:${pad2(ss)}`;
  }

  function money(n){
    try{
      return new Intl.NumberFormat('ar-SA').format(Number(n));
    }catch(e){
      return String(n);
    }
  }

  function safeText(s, max=1200){
    if (s==null) return '';
    return String(s).replace(/[<>]/g,'').slice(0,max);
  }

  function lsGet(key, fallback=null){
    try{
      const v = localStorage.getItem(LS_PREFIX+key);
      return v ? JSON.parse(v) : fallback;
    }catch(e){ return fallback; }
  }
  function lsSet(key, value){
    try{ localStorage.setItem(LS_PREFIX+key, JSON.stringify(value)); }catch(e){}
  }
  function lsDel(key){
    try{ localStorage.removeItem(LS_PREFIX+key); }catch(e){}
  }

  const App = {
    DATA,
    $, $$,
    money,
    lsGet, lsSet, lsDel,
    isUnlocked(){
      return !!lsGet('unlock', false);
    },
    setUnlocked(v){
      lsSet('unlock', !!v);
    },
    toast(msg, title){
      Toast.show(msg, title);
    },
    navigate(url){
      Router.go(url);
    },
    openModal(id){
      Modals.open(id);
    },
    closeModal(){
      Modals.close();
    },
    openTelegram(text){
      const username = (DATA.telegramUsername || '').replace('@','').trim();
      const url = `https://t.me/${encodeURIComponent(username)}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener');
    }
  };
  window.App = App;

  /* -------------------------
     Service Worker
  ------------------------- */
  function registerSW(){
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  /* -------------------------
     Drawer
  ------------------------- */
  const Drawer = {
    init(){
      const el = $('#drawer');
      if(!el) return;
      const openBtn = $('[data-drawer-open]');
      const closeBtn = $('[data-drawer-close]');
      const closeAll = () => el.classList.remove('open');

      openBtn && openBtn.addEventListener('click', ()=> el.classList.add('open'));
      closeBtn && closeBtn.addEventListener('click', closeAll);
      el.addEventListener('click', (e)=>{
        if (e.target === el) closeAll();
      });
      $$('.drawer a', el).forEach(a=>{
        a.addEventListener('click', ()=> closeAll());
      });
    }
  };

  /* -------------------------
     Accordions
  ------------------------- */
  function initAccordions(root=document){
    $$('.acc', root).forEach(acc=>{
      const btn = $('button', acc);
      if(!btn) return;
      btn.addEventListener('click', ()=>{
        acc.classList.toggle('open');
      });
    });
  }

  /* -------------------------
     Toast Notifications
  ------------------------- */
  const Toast = {
    wrap: null,
    lastAt: 0,
    show(msg, title){
      if (!this.wrap) this.wrap = $('#toastWrap');
      if (!this.wrap) return;

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `
        <div>${safeText(msg, 220)}</div>
        <div class="t">${safeText(title || 'تنبيه من المنصة', 60)}</div>
      `;
      this.wrap.prepend(toast);
      requestAnimationFrame(()=> toast.classList.add('show'));

      setTimeout(()=> {
        toast.classList.remove('show');
        setTimeout(()=> toast.remove(), 250);
      }, 5200);
    },
    start(){
      const muted = lsGet('toastMuted', false);
      if(muted) return;
      const list = DATA.notifications || [];
      if(!list.length) return;

      const tick = ()=>{
        const delay = 11000 + Math.floor(Math.random()*9000);
        setTimeout(()=>{
          const msg = list[Math.floor(Math.random()*list.length)];
          this.show(msg, 'إشعار');
          tick();
        }, delay);
      };
      // start after a short grace period
      setTimeout(()=> tick(), 9000);
    }
  };

  /* -------------------------
     Seats + Discount countdown
  ------------------------- */
  const Seats = {
    init(){
      const cfg = DATA.seats || {initial:150, decrementEverySeconds:30, refillThreshold:5, refillAmount:50};
      const state = lsGet('seatsState', null);

      if(!state){
        lsSet('seatsState', {
          seatsLeft: cfg.initial,
          lastUpdate: now(),
          refills: 0,
          lastRefill: 0
        });
      }

      // Discount start
      if(!lsGet('discountStart', null)){
        lsSet('discountStart', now());
      }

      // UI update loop
      setInterval(()=> this.update(), 1000);
      this.update();
    },
    compute(){
      const cfg = DATA.seats || {};
      const decEvery = (cfg.decrementEverySeconds || 30) * 1000;
      const threshold = cfg.refillThreshold ?? 5;
      const refill = cfg.refillAmount ?? 50;

      let st = lsGet('seatsState', null);
      if(!st){
        st = {seatsLeft: (cfg.initial||150), lastUpdate: now(), refills:0, lastRefill:0};
      }

      const elapsed = now() - (st.lastUpdate || now());
      const steps = Math.floor(elapsed / decEvery);

      if(steps > 0){
        st.seatsLeft = Math.max(0, (st.seatsLeft||0) - steps);
        st.lastUpdate = (st.lastUpdate || now()) + steps * decEvery;
      }

      // Refill logic (once each time it hits threshold)
      if(st.seatsLeft <= threshold){
        // prevent rapid re-refill in the same second
        if(!st.lastRefill || (now() - st.lastRefill) > decEvery){
          st.seatsLeft += refill;
          st.refills = (st.refills || 0) + 1;
          st.lastRefill = now();
          Toast.show('تم فتح مقاعد إضافية لكثرة الطلب 🚀', 'تحديث المقاعد');
        }
      }

      lsSet('seatsState', st);
      return {cfg, st, decEvery};
    },
    update(){
      const {cfg, st, decEvery} = this.compute();
      const seatsLeft = st.seatsLeft ?? cfg.initial ?? 150;

      // Seats text
      $$('[data-seats-left]').forEach(el=>{
        el.textContent = String(seatsLeft);
      });

      // Seats label severity
      $$('[data-seats-label]').forEach(el=>{
        let label = 'متاح';
        let cls = '';
        if(seatsLeft <= 20) { label = 'قربت تخلص'; cls='warn'; }
        if(seatsLeft <= 8) { label = 'آخر مقاعد'; cls='danger'; }
        el.textContent = label;
        el.classList.remove('warn','danger');
        if(cls) el.classList.add(cls);
      });

      // Seats progress (percentage based on moving capacity)
      const cap = (cfg.initial || 150) + (st.refills||0)*(cfg.refillAmount||50);
      const pct = cap ? (seatsLeft / cap) * 100 : 50;
      $$('[data-seat-progress]').forEach(el=>{
        el.style.width = clamp(pct, 1, 100).toFixed(1) + '%';
      });

      // Next seat in
      const msToNext = decEvery - (now() - (st.lastUpdate || now()));
      $$('[data-seats-next]').forEach(el=>{
        el.textContent = formatTime(msToNext);
      });

      // Discount countdown
      const dCfg = DATA.pricing || {};
      const start = lsGet('discountStart', now());
      const totalMs = (dCfg.discountDays || 7) * 86400 * 1000;
      const remain = totalMs - (now() - start);

      const discountActive = remain > 0;

      $$('[data-discount-countdown]').forEach(el=>{
        el.textContent = discountActive ? formatTime(remain) : 'انتهى الخصم';
      });

      // Prices
      $$('[data-price-discount]').forEach(el=>{
        el.textContent = money(dCfg.discountPrice ?? 449);
      });
      $$('[data-price-official]').forEach(el=>{
        el.textContent = money(dCfg.officialPrice ?? 599);
      });

      $$('[data-price-mode]').forEach(el=>{
        el.textContent = discountActive ? 'سعر الخصم' : 'السعر الرسمي';
      });

      $$('[data-price-active]').forEach(el=>{
        const value = discountActive ? (dCfg.discountPrice ?? 449) : (dCfg.officialPrice ?? 599);
        el.textContent = money(value);
      });

      $$('[data-discount-active]').forEach(el=>{
        el.style.display = discountActive ? '' : 'none';
      });
      $$('[data-discount-expired]').forEach(el=>{
        el.style.display = discountActive ? 'none' : '';
      });
    }
  };

  /* -------------------------
     Modals
  ------------------------- */
  const Modals = {
    el: null,
    init(){
      this.el = $('#modal');
      if(!this.el) return;

      this.el.addEventListener('click', (e)=>{
        if(e.target === this.el) this.close();
      });

      const closeBtn = $('[data-modal-close]', this.el);
      closeBtn && closeBtn.addEventListener('click', ()=> this.close());

      $$('[data-open-modal]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const id = btn.getAttribute('data-open-modal');
          this.open(id);
        });
      });
    },
    open(id){
      if(!this.el) return;
      const title = this.el.querySelector('[data-modal-title]');
      const body = this.el.querySelector('[data-modal-body]');

      const tpl = document.getElementById(id);
      if(tpl && body){
        body.innerHTML = tpl.innerHTML;
      }else if(body){
        body.innerHTML = '<p>المحتوى غير متوفر.</p>';
      }
      if(title){
        title.textContent = (tpl && tpl.getAttribute('data-title')) ? tpl.getAttribute('data-title') : 'معلومات';
      }

      this.el.classList.add('open');
      this.el.style.display='grid';

      // Wire assistant chat if needed
      if(id === 'assistant_tpl'){
        AssistantChat.wire(this.el);
      }

    },
    close(){
      if(!this.el) return;
      this.el.classList.remove('open');
      this.el.style.display='none';
    }
  };

  /* -------------------------
     Install Prompt
  ------------------------- */
  const Install = {
    deferred: null,
    el: null,
    shown: false,
    init(){
      this.el = $('#install');
      if(!this.el) return;

      // Any button/link with data-open-install will open the install sheet
      document.addEventListener('click', (e)=>{
        const t = e.target && e.target.closest ? e.target.closest('[data-open-install]') : null;
        if(t){
          e.preventDefault();
          // ضغطة واحدة = تثبيت مباشر إذا كان متاحًا
          if(this.deferred){
            this.deferred.prompt();
            this.deferred.userChoice.then((choice)=>{
              if(choice && choice.outcome === 'accepted'){
                window.App && App.toast('تم التثبيت ✅', 'تم');
              }
              this.deferred = null;
              this.hide();
            });
          }else{
            this.show();
          }
        }
      }); 
      });

      // iOS hint
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      const closeBtn = $('[data-install-close]', this.el);
      const installBtn = $('[data-install-go]', this.el);

      closeBtn && closeBtn.addEventListener('click', ()=>{
        this.hide();
        lsSet('installDismissed', true);
      });

      installBtn && installBtn.addEventListener('click', async ()=>{
        if(this.deferred){
          this.deferred.prompt();
          const choice = await this.deferred.userChoice.catch(()=>null);
          this.deferred = null;
          this.hide();
          if(choice && choice.outcome === 'accepted'){
            Toast.show('تم التثبيت ✅ الآن افتح المنصة من الشاشة الرئيسية', 'جاهز');
          }else{
            Toast.show('تقدر تثبت المنصة لاحقًا من نفس الزر', 'معلومة');
          }
          return;
        }
        if(isIOS && !isStandalone){
          // show iOS instructions
          const body = $('[data-install-body]', this.el);
          if(body){
            body.innerHTML = `
              <p>على iPhone/iPad: افتح الموقع عبر Safari ثم اضغط زر <span class="kbd">مشاركة</span> واختر <span class="kbd">إضافة إلى الشاشة الرئيسية</span>.</p>
              <p class="small">بعد التثبيت بتصير المنصة مثل تطبيق: أسرع + تحفظ تقدمك + تجربة مرتبة.</p>
            `;
          }
        }
      });

      window.addEventListener('beforeinstallprompt', (e)=>{
        e.preventDefault();
        this.deferred = e;

        const dismissed = lsGet('installDismissed', false);
        if(dismissed) return;

        // show after a little interaction
        if(!this.shown){
          setTimeout(()=> this.show(), 8500);
        }
      });

      // If already installed, don't show
      window.addEventListener('appinstalled', ()=>{
        this.hide();
      });
    },
    show(){
      if(!this.el) return;
      if(this.shown) return;
      this.shown = true;

      const dismissed = lsGet('installDismissed', false);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      if(dismissed || isStandalone) return;

      this.el.classList.add('show');
    },
    hide(){
      if(!this.el) return;
      this.el.classList.remove('show');
    }
  };


  /* -------------------------
     Assistant Chat (in-modal)
  ------------------------- */
  const AssistantChat = {
    wired: false,
    knowledge: null,
    wire(modalEl){
      try{
        const body = modalEl.querySelector('[data-modal-body]');
        if(!body) return;

        const log = body.querySelector('[data-chat-log]');
        const input = body.querySelector('[data-chat-input]');
        const send = body.querySelector('[data-chat-send]');
        const chips = body.querySelectorAll('[data-chip]');

        if(!log || !input || !send) return;

        const faq = (DATA.assistant && DATA.assistant.faq) ? DATA.assistant.faq : [];
        const quick = (DATA.assistant && DATA.assistant.quickActions) ? DATA.assistant.quickActions : [];

        const addBubble = (text, who)=>{
          const div = document.createElement('div');
          div.className = 'bubble ' + (who === 'me' ? 'me' : 'bot');
          div.textContent = text;
          log.appendChild(div);
          log.scrollTop = log.scrollHeight;
        };

        const answer = (q)=>{
          const text = (q || '').toLowerCase();

          // keyword routing
          if(text.includes('سعر') || text.includes('كم') || text.includes('خصم')){
            const p = DATA.pricing || {};
            const msg = `السعر الحالي ${money(p.discountPrice ?? 449)} ر.س (بدل ${money(p.officialPrice ?? 599)}). الخصم محدود، وعدد المقاعد يتحدث تلقائياً.`;
            return msg;
          }
          if(text.includes('مقاعد') || text.includes('seat')){
            return `المقاعد المتبقية تظهر أعلى الصفحة وتتحدث تلقائياً. إذا قربت تخلص يتم فتح مقاعد إضافية لكثرة الطلب ✅`;
          }
          if(text.includes('تسجيل') || text.includes('تحويل') || text.includes('ايصال') || text.includes('إيصال')){
            const b = DATA.bank || {};
            return `طريقة التسجيل باختصار: (1) أنهِ اختبار تحديد المستوى، (2) افتح صفحة التسجيل، (3) حوّل على البيانات الرسمية ثم ارفع الإيصال، (4) اضغط إرسال — تفتح لك رسالة جاهزة في تيليجرام للحساب الرسمي.\nالبنك: ${b.bankName || ''} • الآيبان: ${b.iban || ''}`;
          }
          if(text.includes('مدة') || text.includes('كم يوم') || text.includes('خطة')){
            return `الخطة تظهر لك تلقائياً بعد اختبار تحديد المستوى حسب مستواك وموعد اختبارك (يوم / 3 أيام / 7 أيام / 15 / 30 / 60 / 90).`;
          }
          if(text.includes('step') || text.includes('ستيب') || text.includes('قياس')){
            return `اختبار STEP هو اختبار كفايات اللغة الإنجليزية. عندنا داخل المنصة: شرح مبسط + اختبار مستوى + خطة مذاكرة + تسجيل في الدورة المكثفة.`;
          }
          if(text.includes('دعم') || text.includes('تواصل') || text.includes('تلجرام')){
            return `التواصل الرسمي عبر تيليجرام: @${DATA.telegramUsername || ''}. تقدر تفتح صفحة الدعم أو تضغط زر (تواصل رسمي).`;
          }
          // fallback: try match FAQ
          for(const item of faq){
            const q2 = (item.q || '').toLowerCase();
            if(q2 && (text.includes(q2.slice(0, Math.min(8, q2.length))) || q2.includes(text))){
              return item.a;
            }
          }
          return 'وصلت فكرتك ✅\nاختر من الأزرار الجاهزة (اختبار/نتيجة/تسجيل) أو اكتب سؤالك بشكل أبسط، وأنا أجاوبك مباشرة.';
        };

        const sendNow = ()=>{
          const q = (input.value || '').trim();
          if(!q) return;
          addBubble(q, 'me');
          input.value = '';
          setTimeout(()=> addBubble(answer(q), 'bot'), 240);
        };

        send.onclick = sendNow;
        input.onkeydown = (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); sendNow(); } };

        chips.forEach(ch=>{
          ch.addEventListener('click', ()=>{
            const q = ch.getAttribute('data-chip') || ch.textContent;
            input.value = q;
            sendNow();
          });
        });

        // initial greeting (only if empty)
        if(!log.children.length){
          const nm = (App.lsGet('profile', null)?.name) || '';
          addBubble(`هلا ${nm ? nm : 'يا بطل'} 👋\nأنا مساعد التسجيل. اسألني عن (السعر، المقاعد، طريقة التسجيل، الخطة) أو اضغط أحد الأزرار تحت.`, 'bot');
        }

        // Quick action buttons inside modal (internal nav)
        body.querySelectorAll('[data-qa]').forEach(a=>{
          a.addEventListener('click', ()=>{
            const href = a.getAttribute('href');
            if(href) Router.go(href);
            Modals.close();
          });
        });

        // Official contact button
        const contactBtn = body.querySelector('[data-contact]');
        contactBtn && contactBtn.addEventListener('click', ()=>{
          Modals.close();
          Router.go('support.html');
        });

      }catch(e){
        // ignore
      }
    }
  };


  /* -------------------------
     Floating Assistant (inside-site)
  ------------------------- */
  const Assistant = {
    init(){
      const fab = $('#fab');
      if(!fab) return;
      fab.addEventListener('click', ()=> Modals.open('assistant_tpl'));
    }
  };

  /* -------------------------
     Router (SPA-like)
  ------------------------- */
  const Router = {
    enabled: true,
    inFlight: false,
    init(){
      // If browser doesn't support fetch, disable
      if(!window.fetch || !window.history || !window.DOMParser) this.enabled=false;

      document.addEventListener('click', (e)=>{
        const a = e.target.closest('a');
        if(!a) return;
        if(a.hasAttribute('data-no-spa')) return;
        const href = a.getAttribute('href') || '';
        if(!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
        if(a.getAttribute('target') === '_blank') return;

        // only intercept html pages
        if(!href.endsWith('.html')) return;

        // Allow normal navigation if disabled
        if(!this.enabled) return;

        e.preventDefault();
        this.go(href);
      });

      window.addEventListener('popstate', ()=>{
        const path = location.pathname.split('/').pop() || 'index.html';
        this.go(path, {push:false});
      });
    },
    async go(href, opts={push:true}){
      if(this.inFlight) return;
      const main = $('#spaMain');
      if(!main) { window.location.href = href; return; }

      // Security: do not fetch cross-origin
      if(/^(https?:)?\/\//i.test(href)) { window.location.href = href; return; }

      try{
        this.inFlight = true;
        main.classList.remove('page-enter');
        main.style.opacity = '.6';

        const res = await fetch(href, {headers:{'X-Requested-With':'spa'}});
        if(!res.ok) throw new Error('Fetch failed');
        const html = await res.text();

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const newMain = doc.querySelector('#spaMain');
        if(!newMain) throw new Error('No main found');

        // Replace main content (انتقالات ناعمة)
        const applyNewPage = () => {
          main.innerHTML = newMain.innerHTML;

          // Update title
          if(doc.title) document.title = doc.title;

          // Update page attribute
          const pageName = newMain.getAttribute('data-page') || 'page';
          document.body.setAttribute('data-page', pageName);
        };

        if('startViewTransition' in document){
          try{
            await document.startViewTransition(()=>{ applyNewPage(); }).finished;
          }catch(e){
            applyNewPage();
          }
        }else{
          applyNewPage();
        }


        // Update active nav links
        Nav.updateActive(href);

        // Re-init UI in new content
        initAccordions(main);
        wireAnchors(main);
        wireCopyButtons(main);
        wireUnlockGuards(main);

        // fire custom event
        window.dispatchEvent(new CustomEvent('app:navigated', {detail:{href}}));

        // Scroll to top (smooth-ish)
        window.scrollTo({top:0, behavior:'smooth'});

        if(opts.push){
          history.pushState({}, '', href);
        }

        // animate enter
        requestAnimationFrame(()=>{
          main.classList.add('page-enter');
          main.style.opacity = '';
        });

      }catch(err){
        // fallback to full navigation
        window.location.href = href;
      }finally{
        this.inFlight = false;
      }
    }
  };

  const Nav = {
    updateActive(href){
      const file = (href || location.pathname.split('/').pop() || 'index.html').split('?')[0];
      $$('[data-nav]').forEach(a=>{
        const h = (a.getAttribute('href')||'').split('?')[0];
        a.classList.toggle('active', h === file);
      });
    }
  };

  /* -------------------------
     Smooth anchors + in-page section buttons
  ------------------------- */
  function wireAnchors(root=document){
    $$('[data-scroll]', root).forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-scroll');
        const target = document.getElementById(id);
        if(target){
          target.scrollIntoView({behavior:'smooth', block:'start'});
        }
      });
    });
  }

  /* -------------------------
     Copy buttons (optional)
  ------------------------- */
  function wireCopyButtons(root=document){
    $$('[data-copy]', root).forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const value = btn.getAttribute('data-copy') || '';
        try{
          await navigator.clipboard.writeText(value);
          Toast.show('تم النسخ ✅', 'نسخ');
        }catch(e){
          Toast.show('تعذر النسخ — انسخ يدويًا', 'تنبيه');
        }
      });
    });
  }

  /* -------------------------
     Unlock guards (Registration gating)
  ------------------------- */
  function wireUnlockGuards(root=document){
    $$('[data-requires-unlock]', root).forEach(el=>{
      el.addEventListener('click', (e)=>{
        if(App.isUnlocked()) return;
        e.preventDefault();
        Toast.show('التسجيل يفتح بعد إنهاء اختبار تحديد المستوى 🎯', 'ملاحظة');
        Router.go('level-test.html');
      });
    });
  }

  /* -------------------------
     Page Boot
  ------------------------- */
  function hydrateGlobals(){
    // Brand text + telegram
    const name = DATA.academyName || 'أكاديمية عايد';
    const sub = DATA.siteName || '';
    const brandName = $('[data-brand-name]');
    const brandSub = $('[data-brand-sub]');
    if(brandName) brandName.textContent = name;
    if(brandSub) brandSub.textContent = sub;

    $$('[data-telegram]').forEach(el=>{
      el.textContent = '@' + (DATA.telegramUsername || '');
    });
    $$('[data-telegram-href]').forEach(el=>{
      el.setAttribute('href', DATA.telegramUrl || '#');
      el.setAttribute('target','_blank');
      el.setAttribute('rel','noopener');
    });

    // body page name (from main)
    const main = $('#spaMain');
    const pageName = main?.getAttribute('data-page') || 'index';
    document.body.setAttribute('data-page', pageName);

    Nav.updateActive(location.pathname.split('/').pop() || 'index.html');
  }

  function boot(){
    hydrateGlobals();
    registerSW();
    Drawer.init();
    Modals.init();
    Install.init();
    Assistant.init();
    Router.init();
    initAccordions(document);
    wireAnchors(document);
    wireCopyButtons(document);
    wireUnlockGuards(document);
    Seats.init();
    Toast.start();

    // Announce app-like feel
    setTimeout(()=>{
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      if(isStandalone) Toast.show('أنت الآن داخل وضع التطبيق ✅ (تم حفظ تقدمك تلقائيًا)', 'مرحبًا');
    }, 1500);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }

})();
